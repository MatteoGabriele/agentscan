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

async function searchUsers(
  octokit: Octokit,
  prsPerRepo: number = PR_SCAN_AMOUNT,
) {
  const users: Array<{
    id: number
    login: string
    created_at: string
    public_repos: number
    profile: IdentifyUser
    repo_name: string
    pr_key: string
    pr_status: PrStatus
  }> = []

  for (const repoFullName of libraries) {
    const [owner, repo] = repoFullName.split('/')
    let prsFromThisRepo = 0

    const prs = await withRetry(
      () =>
        octokit.rest.pulls.list({
          owner,
          repo,
          state: 'all',
          sort: 'created',
          direction: 'desc',
          per_page: 50,
        }),
      `${repoFullName}: fetch PRs`,
    )

    for (const pr of prs.data) {
      if (prsFromThisRepo >= prsPerRepo) {
        break
      }
      if (!pr.user?.login) {
        continue
      }

      if (isKnownBot(pr.user.login)) {
        console.log(`  ${repoFullName}: skipping known bot`)
        continue
      }

      const fullProfile = await withRetry(
        () => octokit.rest.users.getByUsername({ username: pr.user!.login }),
        `${repoFullName}: fetch user ${pr.user.login}`,
      )

      users.push({
        id: fullProfile.data.id,
        login: fullProfile.data.login,
        created_at: fullProfile.data.created_at,
        pr_key: hashPrId(repoFullName, pr.number),
        pr_status: pr.merged_at ? 'merged' : (pr.state as PrStatus),
        public_repos: fullProfile.data.public_repos,
        profile: fullProfile.data,
        repo_name: repoFullName,
      })

      prsFromThisRepo++
      console.log(`  ${repoFullName}: ${prsFromThisRepo}/${prsPerRepo}`)

      await new Promise((resolve) =>
        setTimeout(resolve, DELAY_BETWEEN_GITHUB_CALLS),
      )
    }

    if (prsFromThisRepo < prsPerRepo) {
      throw new Error(
        `${repoFullName}: only ${prsFromThisRepo}/${prsPerRepo} PRs collected — aborting scan`,
      )
    }
  }

  return users
}

export async function main(options: ScanOptions = {}) {
  const {
    dryRun = false,
    prsPerRepo = PR_SCAN_AMOUNT,
    outputFile = DEFAULT_OUTPUT_FILE,
    maxScans,
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
  const now = new Date().toISOString()

  const users = await searchUsers(octokit, prsPerRepo)

  let completedCount = 0
  const repoScores: Map<string, number> = new Map()

  for (const user of users) {
    console.log(
      `Scanning (${completedCount + 1}/${users.length}) [${user.repo_name}]`,
    )

    const events = await withRetry(
      () => fetchUserEvents(octokit, user.login),
      `fetch events for ${user.login}`,
    )

    const analysis = identify({ user: user.profile, events })

    let score = analysis.score
    const eventsCount = events.length

    if (analysis.classification === 'insufficient-data') {
      score = INSUFFICIENT_DATA_SCORE
    }

    // A confirmed automation stays an automation regardless of data volume.
    if (verifiedAutomations.has(user.id)) {
      score = 0
    }

    scanResults.push({
      created_at: now,
      score,
      pr_key: user.pr_key,
      pr_status: user.pr_status,
      user_created_at: user.created_at,
      user_public_repos_count: user.public_repos,
      events_count: eventsCount,
      repo_name: user.repo_name,
      is_bounty: analysis.isBountyHunter,
    })

    if (score !== INSUFFICIENT_DATA_SCORE) {
      const currentScore = repoScores.get(user.repo_name) ?? 0
      repoScores.set(user.repo_name, currentScore + score)
    }

    completedCount++

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_SCANS))
  }

  // Only reached if every repo and every user scan succeeded
  const finalResults =
    maxScans != null ? trimToRecentScans(scanResults, maxScans) : scanResults

  saveScanResults(finalResults, outputFile, dryRun)

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

  main({
    dryRun,
    ...(prsPerRepo != null && { prsPerRepo }),
    ...(outputFile && { outputFile }),
    ...(maxScans != null && { maxScans }),
  }).catch((error) => {
    console.error('Fatal error:', error.message)
    process.exit(1)
  })
}
