/// <reference types="node" />

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { Octokit } from 'octokit'

// Labels and commenters that reliably identify a repo as offering bounties.
// Each entry has a source tag so we can later understand where a repo came from.
const BOUNTY_SEARCHES: Array<{ query: string; source: string }> = [
  // Generic label placed by maintainers or bounty platforms
  { query: 'label:bounty is:open type:issue', source: 'label:bounty' },
  // Algora platform — adds this label via its bot
  {
    query: 'label:"💰 Bounty" is:open type:issue',
    source: 'label:💰 Bounty',
  },
  // IssueHunt platform — adds this label on funded issues
  {
    query: 'label:issuehunt-funded is:open type:issue',
    source: 'label:issuehunt-funded',
  },
  // Opire platform label
  {
    query: 'label:opire-bounty is:open type:issue',
    source: 'label:opire-bounty',
  },
  // Algora bot commenter — any issue where the bot left a funding comment
  {
    query: 'commenter:algora-io[bot] type:issue',
    source: 'bot:algora-io',
  },
]

// How many pages to fetch per search query (GitHub Search API caps at 10 pages / 1000 results).
const PAGES_PER_QUERY = 5
const PER_PAGE = 100
// Pause between API calls to stay within the 30 req/min Search API rate limit.
const DELAY_MS = 2500
const RETRY_DELAY_MS = 5000

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const MAX_RETRIES = 2
  let lastError: Error
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt <= MAX_RETRIES) {
        console.warn(
          `  [retry ${attempt}/${MAX_RETRIES}] ${label}: ${lastError.message} — retrying in ${RETRY_DELAY_MS}ms...`,
        )
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
      }
    }
  }
  throw lastError!
}

interface BountyRepo {
  repo: string
  sources: string[]
  first_seen: string
  last_updated: string
}

function loadBountyRepos(): Map<string, BountyRepo> {
  const filePath = join(process.cwd(), 'data', 'bounty-repos.json')
  try {
    const items: BountyRepo[] = JSON.parse(readFileSync(filePath, 'utf-8'))
    return new Map(items.map((r) => [r.repo, r]))
  } catch {
    return new Map()
  }
}

function saveBountyRepos(repos: Map<string, BountyRepo>): void {
  const filePath = join(process.cwd(), 'data', 'bounty-repos.json')
  const sorted = Array.from(repos.values()).sort((a, b) => a.repo.localeCompare(b.repo))
  writeFileSync(filePath, JSON.stringify(sorted, null, 2))
}

function repoSlugFromUrl(url: string): string {
  // "https://api.github.com/repos/owner/name" → "owner/name"
  const parts = url.split('/repos/')
  return parts[1] ?? url
}

async function fetchReposForQuery(
  octokit: Octokit,
  query: string,
  source: string,
): Promise<Map<string, string>> {
  const found = new Map<string, string>() // repo slug → source

  for (let page = 1; page <= PAGES_PER_QUERY; page++) {
    const res = await withRetry(
      () =>
        octokit.rest.search.issuesAndPullRequests({
          q: query,
          per_page: PER_PAGE,
          page,
        }),
      `[${source}] page ${page}`,
    )

    for (const item of res.data.items) {
      const slug = repoSlugFromUrl(item.repository_url)
      if (!found.has(slug)) {
        found.set(slug, source)
      }
    }

    console.log(
      `  [${source}] page ${page}: ${res.data.items.length} results (${found.size} unique repos so far)`,
    )

    // Stop early if we've received fewer results than requested
    if (res.data.items.length < PER_PAGE) break

    await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
  }

  return found
}

async function main() {
  const token = process.env.GITHUB_TOKEN ?? process.env.NUXT_GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not set')

  const octokit = new Octokit({ auth: token })
  const existing = loadBountyRepos()
  const now = new Date().toISOString()
  let newCount = 0
  let updatedCount = 0

  for (const { query, source } of BOUNTY_SEARCHES) {
    console.log(`\nSearching: ${source}`)
    const found = await fetchReposForQuery(octokit, query, source)

    for (const [slug, src] of found) {
      const entry = existing.get(slug)
      if (!entry) {
        existing.set(slug, {
          repo: slug,
          sources: [src],
          first_seen: now,
          last_updated: now,
        })
        newCount++
      } else {
        if (!entry.sources.includes(src)) {
          entry.sources.push(src)
          updatedCount++
        }
        entry.last_updated = now
      }
    }
  }

  saveBountyRepos(existing)

  console.log(`\nDone.`)
  console.log(`  Total repos: ${existing.size}`)
  console.log(`  New: ${newCount}`)
  console.log(`  Updated (new source): ${updatedCount}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}
