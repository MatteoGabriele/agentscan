import type {
  AutomationTally,
  VerifiedAutomation,
} from '../shared/types/automation'
import { libraries } from '../shared/daily-scan'
import { isKnownBot } from '../shared/cicd-known-bots'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Octokit } from 'octokit'
import { identify } from '@unveil/identity'
import type { GitHubEvent, IdentifyUser } from '@unveil/identity'
import { encryptValue } from '../shared/utils/encrypt-values'
import { pack, unpack } from '../shared/utils/compactor'
import type { DailyScanEntry } from '../shared/utils/daily-rollup'
import {
  getCompletedDailyEntries,
  mergeDailyEntries,
} from '../shared/utils/daily-rollup'
import {
  INSUFFICIENT_DATA_SCORE,
  classifyByScore,
} from '../shared/utils/health-stats'
import type { PrStatus } from '../shared/types/ecosystem-health'

// Configuration
const DELAY_BETWEEN_SCANS = 1000
// Mirrors MAX_API_ALLOWED_PAGES in server/api/identify-replicant/[username].get.ts
// so local scores stay identical to the ones the site produces.
const EVENT_PAGES = 3
const EVENTS_PER_PAGE = 100
const DELAY_BETWEEN_GITHUB_CALLS = 200
const RETRY_DELAY_MS = 5000
const RETRY_MAX_ATTEMPT = 2
const PRS_PER_PAGE = 50
// Safety net for the hourly window.
const WINDOW_MAX_PAGES = 5
// Ceiling on what one repo may contribute to one hour. Scoring an author costs
// four API calls and ~2s, and the run has to finish inside the hour it measures
// with budget left for the next one.
const MAX_PRS_PER_REPO = 30

interface ScanResult {
  created_at: string
  score: number
  user_created_at: string
  user_public_repos_count: number
  events_count: number
  repo_name: string
  pr_key: string
  pr_status: PrStatus
  is_bounty: boolean
}

interface ScanOptions {
  dryRun?: boolean
  /**
   * The hourly log, and the run's only measurement: every PR opened during the
   * previous full hour, written as one bucket per run.
   */
  outputFile: string
  /** Keep only the N most recent hourly buckets in the output file. */
  maxScans?: number
  /**
   * Where this run appends its day entries, rolled up from the hourly buckets
   * once a day has all of its hours. Days already in the file are kept, so a
   * re-run never rewrites a day it already measured.
   */
  dailyOutputFile?: string
  /**
   * Where the run records the accounts it scored as automations, as
   * `[hashedId, prCount]` pairs. Unlike every other output this one only
   * ever grows: it is a tally across scans, not a window over them.
   */
  automationIdsOutputFile?: string
}

type GitHubUser = Awaited<
  ReturnType<Octokit['rest']['users']['getByUsername']>
>['data']

interface CollectedPr {
  id: number
  login: string
  created_at: string
  public_repos: number
  profile: IdentifyUser
  repo_name: string
  pr_key: string
  pr_status: PrStatus
}

/**
 * The previous full clock hour: a run at 08:04 covers 07:00:00 → 07:59:59.
 * Anchoring to the hour boundary rather than "now minus 60 minutes" keeps
 * windows contiguous and gap-free even when a run starts late.
 */
export function previousHourWindow(now: Date): { start: Date; end: Date } {
  const end = new Date(now)
  end.setUTCMinutes(0, 0, 0)
  const start = new Date(end.getTime() - 60 * 60 * 1000)
  return { start, end }
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: Error
  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPT + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt <= RETRY_MAX_ATTEMPT) {
        console.warn(
          `  [retry ${attempt}/${RETRY_MAX_ATTEMPT}] ${label}: ${lastError.message} — retrying in ${RETRY_DELAY_MS}ms...`,
        )
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }
  throw lastError!
}

function loadVerifiedAutomations(): Set<number> {
  const filePath = join(process.cwd(), 'data', 'verified-automations-list.json')
  try {
    const data: VerifiedAutomation[] = JSON.parse(
      readFileSync(filePath, 'utf-8'),
    )
    return new Set(data.map((item) => item.id))
  } catch {
    return new Set()
  }
}

function loadScanResults(outputFile: string): ScanResult[] {
  const filePath = join(process.cwd(), 'data', outputFile)
  try {
    return unpack(readFileSync(filePath, 'utf-8')) as ScanResult[]
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw err
  }
}

function saveScanResults(
  results: ScanResult[],
  outputFile: string,
  dryRun: boolean = false,
): void {
  if (dryRun) {
    return
  }
  const filePath = join(process.cwd(), 'data', outputFile)
  writeFileSync(filePath, pack(results))
}

function loadDailyEntries(outputFile: string): DailyScanEntry[] {
  const filePath = join(process.cwd(), 'data', outputFile)
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw err
  }
}

function saveDailyEntries(
  entries: DailyScanEntry[],
  outputFile: string,
  dryRun: boolean = false,
): void {
  if (dryRun) {
    return
  }
  const filePath = join(process.cwd(), 'data', outputFile)
  writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`)
}

function loadAutomationIds(outputFile: string): AutomationTally[] {
  const filePath = join(process.cwd(), 'data', outputFile)
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw err
  }
}

function saveAutomationIds(
  tallies: AutomationTally[],
  outputFile: string,
  dryRun: boolean = false,
): void {
  if (dryRun) {
    return
  }
  const filePath = join(process.cwd(), 'data', outputFile)
  writeFileSync(filePath, `${JSON.stringify(tallies, null, 2)}\n`)
}

export function mergeAutomationIds(
  stored: AutomationTally[],
  seen: Iterable<string>,
): AutomationTally[] {
  const merged = stored.map((entry): AutomationTally => [entry[0], entry[1]])
  const indexById = new Map(merged.map((entry, index) => [entry[0], index]))

  for (const id of seen) {
    const index = indexById.get(id)
    if (index == null) {
      indexById.set(id, merged.length)
      merged.push([id, 1])
    } else {
      merged[index][1] += 1
    }
  }

  return merged
}

// Drops the oldest scan runs so the file holds at most `maxScans` of them.
// Entries written by the same run share a `created_at`, so runs are grouped by it.
export function trimToRecentScans(
  results: ScanResult[],
  maxScans: number,
): ScanResult[] {
  const runs = Array.from(new Set(results.map((r) => r.created_at))).sort()
  if (runs.length <= maxScans) {
    return results
  }
  const kept = new Set(runs.slice(-maxScans))
  return results.filter((r) => kept.has(r.created_at))
}

async function fetchUserEvents(
  octokit: Octokit,
  username: string,
): Promise<GitHubEvent[]> {
  const pages = await Promise.all(
    Array.from({ length: EVENT_PAGES }, (_, index) =>
      octokit.rest.activity.listPublicEventsForUser({
        username,
        per_page: EVENTS_PER_PAGE,
        page: index + 1,
      }),
    ),
  )

  return pages.flatMap((page) => page.data) as GitHubEvent[]
}

/**
 * Walks each repo's PR list and collects the PRs *opened* inside `window`
 * however many that is, often zero for quiet repos.
 */
export async function collectPrs(
  octokit: Octokit,
  window: { start: Date; end: Date },
) {
  const windowed: CollectedPr[] = []
  const skipped: { repo_name: string; reason: string }[] = []
  // An account can author PRs in several tracked repos in the same run —
  // fetch its profile once.
  const profiles = new Map<string, GitHubUser>()

  async function getProfile(login: string, label: string) {
    const cached = profiles.get(login)
    if (cached) {
      return cached
    }

    const fullProfile = await withRetry(
      () => octokit.rest.users.getByUsername({ username: login }),
      label,
    )
    profiles.set(login, fullProfile.data)

    await new Promise((resolve) =>
      setTimeout(resolve, DELAY_BETWEEN_GITHUB_CALLS),
    )

    return fullProfile.data
  }

  function countsTowardCap(pr: {
    created_at: string
    user?: { login?: string } | null
  }) {
    const createdAt = new Date(pr.created_at)
    return (
      createdAt >= window.start &&
      createdAt < window.end &&
      !!pr.user?.login &&
      !isKnownBot(pr.user.login)
    )
  }

  for (const repoFullName of libraries) {
    const [owner, repo] = repoFullName.split('/')
    const repoWindowed: CollectedPr[] = []

    try {
      // Keep paging until a page ends before the window starts.
      const prs: Awaited<ReturnType<typeof octokit.rest.pulls.list>>['data'] =
        []

      for (let page = 1; page <= WINDOW_MAX_PAGES; page++) {
        const response = await withRetry(
          () =>
            octokit.rest.pulls.list({
              owner,
              repo,
              state: 'all',
              sort: 'created',
              direction: 'desc',
              per_page: PRS_PER_PAGE,
              page,
            }),
          `${repoFullName}: fetch PRs (page ${page})`,
        )

        prs.push(...response.data)

        const oldest = response.data.at(-1)
        const exhausted = response.data.length < PRS_PER_PAGE
        const reachedWindowStart =
          !oldest || new Date(oldest.created_at) < window.start
        const capFilled = prs.filter(countsTowardCap).length >= MAX_PRS_PER_REPO

        if (exhausted || reachedWindowStart || capFilled) {
          break
        }
      }

      for (const pr of prs) {
        const createdAt = new Date(pr.created_at)

        // Sorted newest first, so the first PR older than the window means
        // there is nothing left in this repo worth reading.
        if (createdAt < window.start) {
          break
        }

        if (repoWindowed.length >= MAX_PRS_PER_REPO) {
          console.warn(
            `  ${repoFullName}: capped at ${MAX_PRS_PER_REPO} PRs in window`,
          )
          break
        }

        // Opened after the window closed — it belongs to the next run.
        if (createdAt >= window.end) {
          continue
        }

        if (!pr.user?.login) {
          continue
        }

        if (isKnownBot(pr.user.login)) {
          console.log(`  ${repoFullName}: skipping known bot`)
          continue
        }

        const profile = await getProfile(
          pr.user.login,
          `${repoFullName}: fetch user ${pr.user.login}`,
        )

        const collected: CollectedPr = {
          id: profile.id,
          login: profile.login,
          created_at: profile.created_at,
          pr_key: encryptValue(repoFullName, pr.number),
          pr_status: pr.merged_at ? 'merged' : (pr.state as PrStatus),
          public_repos: profile.public_repos,
          profile,
          repo_name: repoFullName,
        }

        repoWindowed.push(collected)
      }
    } catch (error) {
      const reason = (error as Error).message
      skipped.push({ repo_name: repoFullName, reason })
      console.warn(`  ${repoFullName}: skipped — ${reason}`)
      continue
    }

    windowed.push(...repoWindowed)

    // No floor on the count: an hour with no PRs is a real result.
    console.log(`  ${repoFullName}: ${repoWindowed.length} in window`)
  }

  // Every repo failing is not a scan with nothing to report — it is a broken
  // run (bad token, revoked access, GitHub down) and must not be written out.
  if (skipped.length === libraries.length) {
    throw new Error(
      `all ${libraries.length} repos failed — aborting scan:\n${skipped
        .map((entry) => `  ${entry.repo_name}: ${entry.reason}`)
        .join('\n')}`,
    )
  }

  return { windowed, skipped }
}

export async function main(options: ScanOptions) {
  const {
    dryRun = false,
    outputFile,
    maxScans,
    dailyOutputFile,
    automationIdsOutputFile,
  } = options

  // Scans run on a separate account's token so they draw from their own rate
  // limit bucket, leaving the site's token untouched by automated traffic.
  const token =
    process.env.NUXT_GITHUB_TOKEN_ANASTELLINE ??
    process.env.GITHUB_TOKEN ??
    process.env.NUXT_GITHUB_TOKEN
  if (!token) {
    throw new Error(
      'NUXT_GITHUB_TOKEN_ANASTELLINE environment variable is not set',
    )
  }

  if (!process.env.PR_HASH_SECRET) {
    throw new Error('PR_HASH_SECRET environment variable is not set')
  }

  const octokit = new Octokit({ auth: token })
  const verifiedAutomations = loadVerifiedAutomations()

  const window = previousHourWindow(new Date())
  // Rows are stamped with the hour they describe, not the moment the run
  // started, so a bucket means "PRs opened during 07:00–08:00".
  const windowAt = window.start.toISOString()

  console.log(
    `Window: ${window.start.toISOString()} → ${window.end.toISOString()}`,
  )

  const { windowed, skipped } = await collectPrs(octokit, window)

  if (skipped.length) {
    console.warn(
      `Skipped ${skipped.length} repo(s): ${skipped
        .map((entry) => entry.repo_name)
        .join(', ')}`,
    )
  }

  // Re-running the workflow inside the same hour rewrites that hour's bucket
  // rather than appending a second copy of it.
  const scanResults = dryRun
    ? []
    : loadScanResults(outputFile).filter(
        (result) => result.created_at !== windowAt,
      )

  // One score per account, reused across every PR it authored in this run —
  // the analysis looks at the user's events, not at the individual PR.
  const scoredUsers = new Map<
    string,
    { score: number; events_count: number; is_bounty: boolean }
  >()

  const automationIds: string[] = []
  const countedPrKeys = new Set<string>()

  // Each run covers a distinct hour, so a PR reaches this tally exactly once.
  function recordAutomationPr(pr: CollectedPr, score: number) {
    // Thresholds live in the identity config, so read the classification back
    // rather than comparing against a number spelled out here.
    if (
      classifyByScore(score) !== 'automation' ||
      countedPrKeys.has(pr.pr_key)
    ) {
      return
    }
    countedPrKeys.add(pr.pr_key)
    automationIds.push(encryptValue(pr.id))
  }

  async function scoreUser(pr: CollectedPr) {
    const cached = scoredUsers.get(pr.login)
    if (cached) {
      return cached
    }

    const events = await withRetry(
      () => fetchUserEvents(octokit, pr.login),
      `fetch events for ${pr.login}`,
    )

    const analysis = identify({ user: pr.profile, events })

    let score = analysis.score

    if (analysis.classification === 'insufficient-data') {
      score = INSUFFICIENT_DATA_SCORE
    }

    // A confirmed automation stays an automation regardless of data volume.
    if (verifiedAutomations.has(pr.id)) {
      score = 0
    }

    const scored = {
      score,
      events_count: events.length,
      is_bounty: analysis.isBountyHunter,
    }
    scoredUsers.set(pr.login, scored)

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_SCANS))

    return scored
  }

  function toResult(
    pr: CollectedPr,
    createdAt: string,
    scored: Awaited<ReturnType<typeof scoreUser>>,
  ): ScanResult {
    return {
      created_at: createdAt,
      score: scored.score,
      pr_key: pr.pr_key,
      pr_status: pr.pr_status,
      user_created_at: pr.created_at,
      user_public_repos_count: pr.public_repos,
      events_count: scored.events_count,
      repo_name: pr.repo_name,
      is_bounty: scored.is_bounty,
    }
  }

  let completedCount = 0
  const repoScores: Map<string, number> = new Map()

  for (const pr of windowed) {
    console.log(
      `Scanning (${++completedCount}/${windowed.length}) [${pr.repo_name}]`,
    )

    const scored = await scoreUser(pr)
    scanResults.push(toResult(pr, windowAt, scored))
    recordAutomationPr(pr, scored.score)

    if (scored.score !== INSUFFICIENT_DATA_SCORE) {
      const currentScore = repoScores.get(pr.repo_name) ?? 0
      repoScores.set(pr.repo_name, currentScore + scored.score)
    }
  }

  // Only reached if every user scan succeeded; repos that failed collection
  // were dropped above and simply contribute no rows to this run.
  const finalResults =
    maxScans != null ? trimToRecentScans(scanResults, maxScans) : scanResults

  saveScanResults(finalResults, outputFile, dryRun)
  console.log(`Window: ${windowed.length} PRs opened in the previous hour`)

  // Rolled up from the untrimmed rows: retention can drop a day's first hour
  // on the very run that completes that day.
  if (dailyOutputFile) {
    const stored = dryRun ? [] : loadDailyEntries(dailyOutputFile)
    const measured = getCompletedDailyEntries(scanResults, windowAt)
    const dailyEntries = mergeDailyEntries(stored, measured)

    saveDailyEntries(dailyEntries, dailyOutputFile, dryRun)
    console.log(`Daily: ${measured.length} day(s) rolled up from the window`)
  }

  if (automationIdsOutputFile) {
    const stored = dryRun ? [] : loadAutomationIds(automationIdsOutputFile)
    const tallies = mergeAutomationIds(stored, automationIds)

    saveAutomationIds(tallies, automationIdsOutputFile, dryRun)
    console.log(
      `Automations: ${automationIds.length} PR(s) from ${new Set(automationIds).size} account(s) this run, ${tallies.length} tracked overall`,
    )
  }

  const sortedRepos = Array.from(repoScores.entries()).sort(
    (a, b) => b[1] - a[1],
  )
  for (const [repo, totalScore] of sortedRepos) {
    console.log(`${repo}: ${totalScore.toFixed(2)}`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const outputArg = args.find((a) => a.startsWith('--output='))
  const outputFile = outputArg ? outputArg.split('=')[1] : undefined

  // No default any more: every scan names the file it writes, so a missing
  // flag is a mistake rather than a silent write to the wrong history.
  if (!outputFile) {
    console.error('Fatal error: --output=<file> is required')
    process.exit(1)
  }

  const maxScansArg = args.find((a) => a.startsWith('--max-scans='))
  const maxScans = maxScansArg
    ? parseInt(maxScansArg.split('=')[1], 10)
    : undefined

  const dailyOutputArg = args.find((a) => a.startsWith('--daily-output='))
  const dailyOutputFile = dailyOutputArg
    ? dailyOutputArg.split('=')[1]
    : undefined

  const automationIdsOutputPrefix = '--automation-ids-output='
  const automationIdsOutputArg = args.find((a) =>
    a.startsWith(automationIdsOutputPrefix),
  )
  const automationIdsOutputFile = automationIdsOutputArg
    ? automationIdsOutputArg.slice(automationIdsOutputPrefix.length)
    : undefined

  main({
    dryRun,
    outputFile,
    ...(maxScans != null && { maxScans }),
    ...(dailyOutputFile && { dailyOutputFile }),
    ...(automationIdsOutputFile && { automationIdsOutputFile }),
  }).catch((error) => {
    console.error('Fatal error:', error.message)
    process.exit(1)
  })
}
