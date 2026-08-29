import { App } from 'octokit'
import type { AdopterRepository } from '~~/shared/types/adopter-repository'

const SEARCH_PAGE_SIZE = 100
const MAX_SEARCH_PAGES = 5
const NODE_BATCH_SIZE = 100
const REPOSITORY_PAGE_SIZE = 100
const AVATAR_SIZE = 50
const ACTION_SEARCH_QUERY =
  '"MatteoGabriele/agentscan-action" path:.github/workflows -is:fork'

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

type Octokit = ReturnType<typeof createOctokit>

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
async function collectActionRepositories(
  token: string,
): Promise<AdopterRepository[]> {
  const octokit = createOctokit(token)
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

// The app leaves nothing in the repository, so we asks GitHub, as the app,
// which installations exist.
async function collectAppRepositories(
  appId: string,
  encodedPrivateKey: string,
): Promise<AdopterRepository[]> {
  if (!appId || !encodedPrivateKey) {
    return []
  }

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

    try {
      const installed = await octokit.paginate(
        octokit.rest.apps.listReposAccessibleToInstallation,
        { per_page: REPOSITORY_PAGE_SIZE },
      )

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
    } catch {
      continue
    }
  }

  return repositories
}

export default defineEventHandler(async (): Promise<AdopterRepository[]> => {
  const config = useRuntimeConfig()

  try {
    const [actionRepositories, appRepositories] = await Promise.all([
      collectActionRepositories(config.githubToken),
      collectAppRepositories(config.githubAppId, config.githubAppPrivateKey),
    ])

    const adopters = new Map<string, AdopterRepository>()

    for (const repository of [...actionRepositories, ...appRepositories]) {
      adopters.set(repository.name, repository)
    }

    return [...adopters.values()].sort((a, b) => b.stars - a.stars)
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch repositories using AgentScan',
      cause: error,
    })
  }
})
