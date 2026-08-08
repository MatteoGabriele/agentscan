/// <reference types="node" />
import type { VerifiedAutomation } from '../shared/types/automation'
import { libraries } from '../shared/daily-scan'
import { isKnownBot } from '../shared/cicd-known-bots'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Octokit } from 'octokit'
import { identify } from '@unveil/identity'
import type { GitHubEvent, IdentifyUser } from '@unveil/identity'
import { hashPrId } from './pr-hash'
import { pack, unpack } from '../shared/utils/compactor'
import type { DailyScanEntry } from '../shared/utils/daily-rollup'
import {
  getCompletedDailyEntries,
  getSampleDailyEntries,
  mergeDailyEntries,
} from '../shared/utils/daily-rollup'
import { INSUFFICIENT_DATA_SCORE } from '../shared/utils/health-stats'
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
const PR_SCAN_AMOUNT = 10
const DEFAULT_OUTPUT_FILE = 'scan-results.txt'
const PRS_PER_PAGE = 50
// Safety net for the hourly window: a repo that opened more than this many PRs
// in a single hour is either enormous or under attack — either way, stop paging.
const WINDOW_MAX_PAGES = 5

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
  prsPerRepo?: number
  outputFile?: string
  /** Keep only the N most recent scan runs in the output file (rolling window). */
  maxScans?: number
  /**
   * When set, the same run also writes a second, time-windowed dataset here:
   * every PR opened during the previous full hour, instead of the fixed
   * top-N-per-repo sample. Omit to leave the run single-file.
   */
  windowOutputFile?: string
  /** Rolling window for `windowOutputFile`, in scan runs. */
  windowMaxScans?: number
  /**
   * Where this run appends its day entries. Both scan shapes feed the same
   * file: alongside `windowOutputFile` it contributes every day the window has
   * completed, and on its own the daily sample run contributes the day it just
   * measured. Days already in the file are kept, so the two never fight over a
   * date — whichever source reached it first owns it.
   */
  dailyOutputFile?: string
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

// Drops the oldest scan runs so the file holds at most `maxScans` of them.
// Entries written by the same run share a `created_at`, so runs are grouped by it.
function trimToRecentScans(
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
 * Walks each repo's PR list once and feeds two datasets from it:
 *
 *   `sample`   — the N most recent PRs per repo, whatever their age. Fixed size,
 *                so the ecosystem graph compares like with like over time.
 *   `windowed` — every PR *opened* inside `window`, however many that is (often
 *                zero for quiet repos). Sized by real activity, not by quota.
 *
 * Both keep closed and merged PRs. The window filters on `created_at` only:
 * a spam PR opened at 07:12 and closed at 07:15 was still opened in the window,
 * and dropping it would delete exactly the population the window is measuring.
 * `pr_status` is carried through so it can be sliced on later — inside a
 * one-hour window a `closed` row means "closed within the hour", which is a
 * signal in its own right rather than a reason to exclude the row.
 */
export async function collectPrs(
  octokit: Octokit,
  prsPerRepo: number = PR_SCAN_AMOUNT,
  window: { start: Date; end: Date } | null = null,
) {
  const sample: CollectedPr[] = []
  const windowed: CollectedPr[] = []
  // An account can author PRs in several tracked repos, and can land in both
  // datasets in the same run — fetch its profile once.
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

  for (const repoFullName of libraries) {
    const [owner, repo] = repoFullName.split('/')
    let prsFromThisRepo = 0
    let windowedFromThisRepo = 0

    // Page 1 alone covers the fixed sample. The window may need more, so keep
    // paging until a page ends before the window starts.
    const prs: Awaited<ReturnType<typeof octokit.rest.pulls.list>>['data'] = []

    for (let page = 1; page <= (window ? WINDOW_MAX_PAGES : 1); page++) {
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
        !window || !oldest || new Date(oldest.created_at) < window.start

      if (exhausted || reachedWindowStart) {
        break
      }
    }

    for (const pr of prs) {
      const createdAt = new Date(pr.created_at)
      const olderThanWindow = !window || createdAt < window.start
      const needsSample = prsFromThisRepo < prsPerRepo

      // Sorted newest first, so once the sample is full and we are past the
      // window there is nothing left in this repo worth reading.
      if (!needsSample && olderThanWindow) {
        break
      }

      const inWindow =
        window != null && !olderThanWindow && createdAt < window.end

      if (!needsSample && !inWindow) {
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
        pr_key: hashPrId(repoFullName, pr.number),
        pr_status: pr.merged_at ? 'merged' : (pr.state as PrStatus),
        public_repos: profile.public_repos,
        profile,
        repo_name: repoFullName,
      }

      if (needsSample) {
        sample.push(collected)
        prsFromThisRepo++
        console.log(`  ${repoFullName}: ${prsFromThisRepo}/${prsPerRepo}`)
      }

      if (inWindow) {
        windowed.push(collected)
        windowedFromThisRepo++
      }
    }

    if (prsFromThisRepo < prsPerRepo) {
      throw new Error(
        `${repoFullName}: only ${prsFromThisRepo}/${prsPerRepo} PRs collected — aborting scan`,
      )
    }

    // No floor on the windowed count: an hour with no PRs is a real result.
    if (window) {
      console.log(`  ${repoFullName}: ${windowedFromThisRepo} in window`)
    }
  }

  return { sample, windowed }
}

export async function main(options: ScanOptions = {}) {
  const {
    dryRun = false,
    prsPerRepo = PR_SCAN_AMOUNT,
    outputFile = DEFAULT_OUTPUT_FILE,
    maxScans,
    windowOutputFile,
    windowMaxScans,
    dailyOutputFile,
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
  const scanResults = dryRun ? [] : loadScanResults(outputFile)
  const verifiedAutomations = loadVerifiedAutomations()
  const now = new Date()
  const runAt = now.toISOString()

  const window = windowOutputFile ? previousHourWindow(now) : null
  // The windowed rows are stamped with the hour they describe, not the moment
  // the run started, so a bucket means "PRs opened during 07:00–08:00".
  const windowAt = window?.start.toISOString()

  if (window) {
    console.log(
      `Window: ${window.start.toISOString()} → ${window.end.toISOString()}`,
    )
  }

  const { sample, windowed } = await collectPrs(octokit, prsPerRepo, window)

  // Re-running the workflow inside the same hour rewrites that hour's bucket
  // rather than appending a second copy of it.
  const windowResults =
    dryRun || !windowOutputFile
      ? []
      : loadScanResults(windowOutputFile).filter(
          (result) => result.created_at !== windowAt,
        )

  // One score per account, reused across every PR it authored in this run —
  // the analysis looks at the user's events, not at the individual PR.
  const scoredUsers = new Map<
    string,
    { score: number; events_count: number; is_bounty: boolean }
  >()

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
  const total = sample.length + windowed.length
  const repoScores: Map<string, number> = new Map()

  for (const pr of sample) {
    console.log(`Scanning (${++completedCount}/${total}) [${pr.repo_name}]`)

    const scored = await scoreUser(pr)
    scanResults.push(toResult(pr, runAt, scored))

    if (scored.score !== INSUFFICIENT_DATA_SCORE) {
      const currentScore = repoScores.get(pr.repo_name) ?? 0
      repoScores.set(pr.repo_name, currentScore + scored.score)
    }
  }

  for (const pr of windowed) {
    console.log(
      `Scanning window (${++completedCount}/${total}) [${pr.repo_name}]`,
    )

    const scored = await scoreUser(pr)
    windowResults.push(toResult(pr, windowAt!, scored))
  }

  // Only reached if every repo and every user scan succeeded
  const finalResults =
    maxScans != null ? trimToRecentScans(scanResults, maxScans) : scanResults

  saveScanResults(finalResults, outputFile, dryRun)

  const finalWindowResults =
    windowMaxScans != null
      ? trimToRecentScans(windowResults, windowMaxScans)
      : windowResults

  if (windowOutputFile) {
    saveScanResults(finalWindowResults, windowOutputFile, dryRun)
    console.log(`Window: ${windowed.length} PRs opened in the previous hour`)
  }

  if (dailyOutputFile) {
    const stored = dryRun ? [] : loadDailyEntries(dailyOutputFile)

    // A window day is only stored once the window has moved past it, so it
    // lands the morning after. A sample run is the entire measurement of the
    // day it runs on — there is no later run to extend it — so its day is
    // ready the moment the run finishes, and it reaches a date first while
    // both scans are alive. That is what keeps this file and the sample the
    // pages read from telling the same story during the switchover.
    const measured = windowOutputFile
      ? getCompletedDailyEntries(finalWindowResults)
      : getSampleDailyEntries(finalResults)

    const dailyEntries = mergeDailyEntries(stored, measured)

    saveDailyEntries(dailyEntries, dailyOutputFile, dryRun)
    console.log(`Daily: ${dailyEntries.length - stored.length} day(s) added`)
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
  const prsPerRepoArg = args.find((a) => a.startsWith('--prs-per-repo='))
  const prsPerRepo = prsPerRepoArg
    ? parseInt(prsPerRepoArg.split('=')[1], PR_SCAN_AMOUNT)
    : undefined

  const outputArg = args.find((a) => a.startsWith('--output='))
  const outputFile = outputArg ? outputArg.split('=')[1] : undefined

  const maxScansArg = args.find((a) => a.startsWith('--max-scans='))
  const maxScans = maxScansArg
    ? parseInt(maxScansArg.split('=')[1], 10)
    : undefined

  const windowOutputArg = args.find((a) => a.startsWith('--window-output='))
  const windowOutputFile = windowOutputArg
    ? windowOutputArg.split('=')[1]
    : undefined

  const windowMaxScansArg = args.find((a) =>
    a.startsWith('--window-max-scans='),
  )
  const windowMaxScans = windowMaxScansArg
    ? parseInt(windowMaxScansArg.split('=')[1], 10)
    : undefined

  const dailyOutputArg = args.find((a) => a.startsWith('--daily-output='))
  const dailyOutputFile = dailyOutputArg
    ? dailyOutputArg.split('=')[1]
    : undefined

  main({
    dryRun,
    ...(prsPerRepo != null && { prsPerRepo }),
    ...(outputFile && { outputFile }),
    ...(maxScans != null && { maxScans }),
    ...(windowOutputFile && { windowOutputFile }),
    ...(windowMaxScans != null && { windowMaxScans }),
    ...(dailyOutputFile && { dailyOutputFile }),
  }).catch((error) => {
    console.error('Fatal error:', error.message)
    process.exit(1)
  })
}
