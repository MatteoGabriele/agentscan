import type { ActionRepository } from '~~/shared/types/action-repository'

// Adopters are found by searching workflow files for the action reference, so a
// repository shows up here as soon as it pins any version of it. Code search
// only indexes default branches, and skips forks unless they outrank their
// parent, so the fork filter below is what actually guarantees the requirement.
const SEARCH_QUERY = '"MatteoGabriele/agentscan-action" path:.github/workflows'

// Code search caps out at 100 items per page. A few pages is far more headroom
// than the action has adopters, and keeps a runaway loop impossible.
const SEARCH_PAGE_SIZE = 100
const MAX_SEARCH_PAGES = 5

// `nodes` refuses more than 100 ids in a single query.
const NODE_BATCH_SIZE = 100

// One search hit is one workflow file, and a repository can reference the
// action from several of them, so the ids are collected into a set first and
// the details are resolved in a single GraphQL round trip per batch. That keeps
// this route at two requests rather than one per repository, which matters:
// code search is rate limited to 10 requests a minute.
const REPOSITORIES_QUERY = `
  query ($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Repository {
        nameWithOwner
        description
        url
        stargazerCount
        isFork
        isPrivate
        owner {
          avatarUrl(size: 50)
        }
      }
    }
  }
`

type RepositoryNode = {
  nameWithOwner: string
  description: string | null
  url: string
  stargazerCount: number
  isFork: boolean
  isPrivate: boolean
  owner: { avatarUrl: string }
}

type Octokit = ReturnType<typeof createOctokit>

async function searchRepositoryIds(octokit: Octokit) {
  const ids = new Set<string>()

  for (let page = 1; page <= MAX_SEARCH_PAGES; page++) {
    const { data } = await octokit.rest.search.code({
      q: SEARCH_QUERY,
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
        REPOSITORIES_QUERY,
        { ids: batch },
      )
    }),
  )

  // `nodes` returns null for anything the token can no longer resolve, such as
  // a repository deleted between the search and this call.
  return responses
    .flatMap((response) => response.nodes)
    .filter((node) => node !== null)
}

export default defineEventHandler(async (): Promise<ActionRepository[]> => {
  const config = useRuntimeConfig()
  const octokit = createOctokit(config.githubToken)

  try {
    const ids = await searchRepositoryIds(octokit)

    if (ids.length === 0) {
      return []
    }

    const repositories = await fetchRepositories(octokit, ids)

    return repositories
      .filter((repository) => !repository.isFork && !repository.isPrivate)
      .map((repository) => ({
        name: repository.nameWithOwner,
        description: repository.description,
        url: repository.url,
        stars: repository.stargazerCount,
        avatar: repository.owner.avatarUrl,
      }))
      .sort((a, b) => b.stars - a.stars)
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch repositories using the action',
      cause: error,
    })
  }
})
