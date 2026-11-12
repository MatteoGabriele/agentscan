/// <reference types="node" />
/**
 * Collects the repositories using AgentScan into data/adopters.json.
 * Run with `pnpm collect:adopters` and commit the file.
 *
 * Credentials from .env:
 *   NUXT_GITHUB_TOKEN            code search across public repos
 *   NUXT_GITHUB_APP_ID           lists the app installations
 *   NUXT_GITHUB_APP_PRIVATE_KEY  base64-encoded PEM
 *
 * Fails without the app credentials, since the result would miss app-only
 * adopters.
 */

import fs from 'fs'
import path from 'path'
import { App, Octokit } from 'octokit'
import type { AdopterRepository } from '../shared/types/adopter-repository'

const SEARCH_PAGE_SIZE = 100
const MAX_SEARCH_PAGES = 5
const NODE_BATCH_SIZE = 100
const REPOSITORY_PAGE_SIZE = 100
const AVATAR_SIZE = 50
const ACTION_SEARCH_QUERY =
  '"MatteoGabriele/agentscan-action" path:.github/workflows -is:fork'

const OUTPUT_PATH = 'data/adopters.json'

const repositoryQuery = `
  query ($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Repository {
        nameWithOwner
        url
        stargazerCount
        owner {
          avatarUrl(size: ${AVATAR_SIZE})
        }
      }
    }
  }
`

type RepositoryNode = {
  nameWithOwner: string
  url: string
  stargazerCount: number
  owner: {
    avatarUrl: string
  }
}

const withAvatarSize = (url: string) =>
  `${url}${url.includes('?') ? '&' : '?'}s=${AVATAR_SIZE}`

async function searchRepositoryIds(octokit: Octokit) {
  const ids = new Set<string>()

  for (let page = 1; page <= MAX_SEARCH_PAGES; page++) {
    const { data } = await octokit.rest.search.code({
      q: ACTION_SEARCH_QUERY,
      per_page: SEARCH_PAGE_SIZE,
      page,
    })

    for (const item of data.items) {
      ids.add(item.repository.node_id)
    }

    if (data.items.length < SEARCH_PAGE_SIZE) {
      break
    }
  }

  return [...ids]
}

async function fetchRepositories(octokit: Octokit, ids: string[]) {
  const batches: string[][] = []

  for (let index = 0; index < ids.length; index += NODE_BATCH_SIZE) {
    batches.push(ids.slice(index, index + NODE_BATCH_SIZE))
  }

  const responses = await Promise.all(
    batches.map((batch) => {
      return octokit.graphql<{ nodes: (RepositoryNode | null)[] }>(
        repositoryQuery,
        { ids: batch },
      )
    }),
  )

  return responses
    .flatMap((response) => response.nodes)
    .filter((node) => node !== null)
}

// Finds action adopters by searching for the workflow file.
export async function collectActionRepositories(
  token: string,
): Promise<AdopterRepository[]> {
  const octokit = new Octokit({ auth: token })
  const ids = await searchRepositoryIds(octokit)

  if (ids.length === 0) {
    return []
  }

  const repositories = await fetchRepositories(octokit, ids)

  return repositories.map((repository) => ({
    name: repository.nameWithOwner,
    url: repository.url,
    stars: repository.stargazerCount,
    avatar: repository.owner.avatarUrl,
    platform: 'action',
  }))
}

// Lists app adopters from the app's installations.
export async function collectAppRepositories(
  appId: string,
  encodedPrivateKey: string,
): Promise<AdopterRepository[]> {
  const privateKey = Buffer.from(encodedPrivateKey, 'base64').toString('utf-8')
  const app = new App({ appId, privateKey })

  const repositories: AdopterRepository[] = []

  for await (const {
    octokit,
    installation,
  } of app.eachInstallation.iterator()) {
    if (installation.suspended_at) {
      continue
    }

    // A failed installation fails the run, so a partial list never overwrites the file.
    let installed
    try {
      installed = await octokit.paginate(
        octokit.rest.apps.listReposAccessibleToInstallation,
        { per_page: REPOSITORY_PAGE_SIZE },
      )
    } catch (err) {
      throw new Error(
        `Could not list the repositories of installation ${installation.id}: ${(err as Error).message}`,
        { cause: err },
      )
    }

    for (const repository of installed) {
      if (repository.private || repository.fork) {
        continue
      }

      repositories.push({
        name: repository.full_name,
        url: repository.html_url,
        stars: repository.stargazers_count,
        avatar: withAvatarSize(repository.owner.avatar_url),
        platform: 'app',
      })
    }
  }

  return repositories
}

/**
 * Merges adopter lists into one entry per repository; later lists win.
 * Sorted by stars, then name, for stable diffs.
 */
export function mergeAdopters(
  ...lists: AdopterRepository[][]
): AdopterRepository[] {
  const adopters = new Map<string, AdopterRepository>()

  for (const repository of lists.flat()) {
    adopters.set(repository.name, repository)
  }

  return [...adopters.values()].sort((a, b) => {
    return b.stars - a.stars || a.name.localeCompare(b.name)
  })
}

export type AdopterDiff = {
  gained: AdopterRepository[]
  lost: AdopterRepository[]
}

// Compares two adopter lists by repository name.
export function diffAdopters(
  previous: AdopterRepository[],
  current: AdopterRepository[],
): AdopterDiff {
  const previousNames = new Set(previous.map((repository) => repository.name))
  const currentNames = new Set(current.map((repository) => repository.name))

  return {
    gained: current.filter((repository) => !previousNames.has(repository.name)),
    lost: previous.filter((repository) => !currentNames.has(repository.name)),
  }
}

export function formatAdopterDiff(
  previousCount: number,
  currentCount: number,
  { gained, lost }: AdopterDiff,
): string {
  if (gained.length === 0 && lost.length === 0) {
    return `= No change since the last run (${currentCount})`
  }

  const describe = (repository: AdopterRepository) =>
    `${repository.name} (${repository.platform}, ★ ${repository.stars})`

  return [
    `Δ +${gained.length} gained, -${lost.length} lost (${previousCount} → ${currentCount})`,
    ...gained.map((repository) => `  + ${describe(repository)}`),
    ...lost.map((repository) => `  - ${describe(repository)}`),
  ].join('\n')
}

// The committed list; empty when the file doesn't exist yet.
function readPreviousAdopters(outputPath: string): AdopterRepository[] {
  if (!fs.existsSync(outputPath)) {
    return []
  }

  return JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as AdopterRepository[]
}

function readEnv(name: string): string {
  const value = process.env[`NUXT_${name}`] || process.env[name]

  if (!value) {
    console.error(`✗ Missing NUXT_${name} in .env`)
    process.exit(1)
  }

  return value
}

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run')

  const token = readEnv('GITHUB_TOKEN')
  const appId = readEnv('GITHUB_APP_ID')
  const privateKey = readEnv('GITHUB_APP_PRIVATE_KEY')

  const [actionRepositories, appRepositories] = await Promise.all([
    collectActionRepositories(token),
    collectAppRepositories(appId, privateKey),
  ])

  const adopters = mergeAdopters(actionRepositories, appRepositories)

  console.log(
    `📋 ${adopters.length} adopter(s): ${actionRepositories.length} from the action, ${appRepositories.length} from the app`,
  )

  // An empty result means a lookup failed; keep the committed file.
  if (adopters.length === 0) {
    console.error('✗ No adopters found — leaving the existing file untouched')
    process.exit(1)
  }

  const outputPath = path.join(process.cwd(), OUTPUT_PATH)
  const previous = readPreviousAdopters(outputPath)
  const diff = formatAdopterDiff(
    previous.length,
    adopters.length,
    diffAdopters(previous, adopters),
  )

  if (dryRun) {
    console.log(JSON.stringify(adopters, null, 2))
    console.log(diff)
    return
  }

  fs.writeFileSync(outputPath, JSON.stringify(adopters, null, 2) + '\n')
  console.log(diff)
  console.log(`✓ Wrote ${OUTPUT_PATH}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
