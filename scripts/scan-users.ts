/// <reference types="node" />
import type { VerifiedAutomation } from '../shared/types/automation'
import { libraries } from '../shared/daily-scan'
import { isKnownBot } from '../shared/cicd-known-bots'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Octokit } from 'octokit'
import type { IdentifyResult } from '@unveil/identity'
import { hashPrId } from './pr-hash'
import { pack, unpack } from '../shared/utils/compactor'

// Configuration
const API_TIMEOUT = 30000
const API_BASE_URL = 'https://agentscan.tools'
const DELAY_BETWEEN_SCANS = 1000
const DELAY_BETWEEN_GITHUB_CALLS = 200
const RETRY_DELAY_MS = 5000
const RETRY_MAX_ATTEMPT = 2
const PR_SCAN_AMOUNT = 10

interface ScanResult {
  created_at: string
  score: number
  user_created_at: string
  user_public_repos_count: number
  events_count: number
  repo_name: string
  pr_key: string
  pr_status: string
  is_bounty: boolean
}

interface ScanOptions {
  dryRun?: boolean
  prsPerRepo?: number
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
    const data: VerifiedAutomation[] = JSON.parse(readFileSync(filePath, 'utf-8'))
    return new Set(data.map((item) => item.id))
  } catch {
    return new Set()
  }
}

function loadScanResults(): ScanResult[] {
  const filePath = join(process.cwd(), 'data', 'scan-results.txt')
  try {
    return unpack(readFileSync(filePath, 'utf-8')) as ScanResult[]
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw err
  }
}

function saveScanResults(results: ScanResult[], dryRun: boolean = false): void {
  if (dryRun) {
    return
  }
  const filePath = join(process.cwd(), 'data', 'scan-results.txt')
  writeFileSync(filePath, pack(results))
}

type ScanUserResponse = {
  analysis: IdentifyResult
  eventsCount: number
}

async function scanUser(
  username: string,
  userCreatedAt: string,
  publicRepos: number,
): Promise<ScanUserResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/identify-replicant/${username}?created_at=${userCreatedAt}&repos_count=${publicRepos}&pages=3`,
      { signal: controller.signal },
    )

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as ScanUserResponse
  } finally {
    clearTimeout(timeoutId)
  }
}

async function searchUsers(octokit: Octokit, prsPerRepo: number = PR_SCAN_AMOUNT) {
  const users: Array<{
    id: number
    login: string
    created_at: string
    public_repos: number
    repo_name: string
    pr_key: string
    pr_status: string
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
        pr_status: pr.state,
        public_repos: fullProfile.data.public_repos,
        repo_name: repoFullName,
      })

      prsFromThisRepo++
      console.log(`  ${repoFullName}: ${prsFromThisRepo}/${prsPerRepo}`)

      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_GITHUB_CALLS))
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
  const { dryRun = false, prsPerRepo = PR_SCAN_AMOUNT } = options

  const token = process.env.GITHUB_TOKEN ?? process.env.NUXT_GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set')
  }

  if (!process.env.PR_HASH_SECRET) {
    throw new Error('PR_HASH_SECRET environment variable is not set')
  }

  const octokit = new Octokit({ auth: token })
  const scanResults = dryRun ? [] : loadScanResults()
  const verifiedAutomations = loadVerifiedAutomations()
  const now = new Date().toISOString()

  const users = await searchUsers(octokit, prsPerRepo)

  let completedCount = 0
  const repoScores: Map<string, number> = new Map()

  for (const user of users) {
    console.log(`Scanning (${completedCount + 1}/${users.length}) [${user.repo_name}]`)

    const scanData = await withRetry(
      () => scanUser(user.login, user.created_at, user.public_repos),
      `scan user ${user.login}`,
    )

    let score = scanData.analysis.score
    const eventsCount = scanData.eventsCount ?? 0

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
      is_bounty: scanData.analysis.isBountyHunter,
    })

    const currentScore = repoScores.get(user.repo_name) ?? 0
    repoScores.set(user.repo_name, currentScore + score)

    completedCount++

    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_SCANS))
  }

  // Only reached if every repo and every user scan succeeded
  saveScanResults(scanResults, dryRun)

  const sortedRepos = Array.from(repoScores.entries()).sort((a, b) => b[1] - a[1])
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

  main({ dryRun, ...(prsPerRepo != null && { prsPerRepo }) }).catch((error) => {
    console.error('Fatal error:', error.message)
    process.exit(1)
  })
}
