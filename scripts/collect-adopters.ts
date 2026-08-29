/// <reference types="node" />
/**
 * Collect the repositories using AgentScan into data/adopters.json.
 *
 * This used to run per request in server/api/adopters.get.ts, but code search
 * is rate limited to 10 requests a minute and listing the app installations
 * costs a token per install. Run it by hand every now and then with
 * `pnpm collect:adopters` and commit the file; the site serves that.
 *
 * Credentials come from .env, the same ones the server uses:
 *   NUXT_GITHUB_TOKEN            a token that may search code across public repos
 *   NUXT_GITHUB_APP_ID           the AgentScan app, to list its installations
 *   NUXT_GITHUB_APP_PRIVATE_KEY  base64-encoded PEM
 *
 * Without the app credentials only the action adopters are collected, which
 * would drop every app-only repository from the file, so the run fails instead.
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

// The action leaves a workflow file behind, so adopters are found by searching
// for it.
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
  }))
}

// The app leaves nothing in the repository, so we ask GitHub, as the app, which
// installations exist.
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

    // Skipping a failed installation would return a short list that still looks
    // healthy and overwrite the committed file, so the whole run fails instead.
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
      })
    }
  }

  return repositories
}

/**
 * A repository running both the action and the app is one adopter. Ties are
 * broken by name so a week without star changes produces no diff at all.
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

  // An empty result means the search or the app listing broke, not that every
  // adopter left, so keep whatever is already committed.
  if (adopters.length === 0) {
    console.error('✗ No adopters found — leaving the existing file untouched')
    process.exit(1)
  }

  if (dryRun) {
    console.log(JSON.stringify(adopters, null, 2))
    return
  }

  const outputPath = path.join(process.cwd(), OUTPUT_PATH)
  fs.writeFileSync(outputPath, JSON.stringify(adopters, null, 2) + '\n')
  console.log(`✓ Wrote ${OUTPUT_PATH}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
