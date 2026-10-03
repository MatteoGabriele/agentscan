import { identify, isGitHubAppAccount } from '@unveil/identity'
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'
import { MAX_PR_COUNT } from '~~/shared/scan'
import type { H3Event } from 'h3'
import type { Endpoints } from '@octokit/types'

export type AuthorAssociation =
  Endpoints['GET /repos/{owner}/{repo}/pulls/{pull_number}']['response']['data']['author_association']

const PER_PAGE = 50
const MAX_PAGES = 5
const EVENT_PAGES = 3

const TRUSTED_ASSOCIATIONS: AuthorAssociation[] = [
  'OWNER',
  'MEMBER',
  'COLLABORATOR',
] as const

type PullRequestEntry = {
  login: string
  prUrl: string
  state: string
}

function getScanTarget(event: H3Event) {
  return parseRepoSlug(String(getQuery(event).repo ?? ''))
}

async function analyzeAuthor(
  octokit: ReturnType<typeof createOctokit>,
  login: string,
) {
  const [profileRes, eventResponses] = await Promise.all([
    octokit.rest.users.getByUsername({ username: login }),
    Promise.all(
      Array.from({ length: EVENT_PAGES }, (_, i) =>
        octokit.rest.activity.listPublicEventsForUser({
          username: login,
          per_page: 100,
          page: i + 1,
        }),
      ),
    ),
  ])

  const user = profileRes.data
  const events = eventResponses.flatMap((r) => r.data)

  return {
    user,
    analysis: identify({ user, events }),
    eventsCount: events.length,
  }
}

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig()
    const repoInput = String(getQuery(event).repo ?? '')

    if (!repoInput) {
      throw createError({ statusCode: 400, message: 'Missing repo parameter' })
    }

    const parsed = getScanTarget(event)
    if (!parsed) {
      throw createError({
        statusCode: 400,
        message:
          'Invalid repository. Expected format: owner/repo or https://github.com/owner/repo',
      })
    }

    const { owner, repo } = parsed
    const octokit = createOctokit(config.githubToken)

    const pullRequests: PullRequestEntry[] = []

    try {
      for (
        let page = 1;
        page <= MAX_PAGES && pullRequests.length < MAX_PR_COUNT;
        page++
      ) {
        const { data: prs } = await octokit.rest.pulls.list({
          owner,
          repo,
          state: 'all',
          sort: 'created',
          direction: 'desc',
          per_page: PER_PAGE,
          page,
        })

        for (const pr of prs) {
          if (pullRequests.length >= MAX_PR_COUNT) {
            break
          }

          if (!pr.user?.login) {
            continue
          }

          if (isGitHubAppAccount(pr.user)) {
            continue
          }

          if (TRUSTED_ASSOCIATIONS.includes(pr.author_association)) {
            continue
          }

          const username = pr.user.login.toLowerCase()

          pullRequests.push({
            login: username,
            prUrl: pr.html_url,
            state: pr.state,
          })
        }

        if (prs.length < PER_PAGE) {
          break
        }
      }

      // One author often holds several of the last PRs on a busy repository.
      // Their profile and event history are the same every time, so analyzing
      // them once keeps a duplicate from spending another four requests.
      const uniqueLogins = [...new Set(pullRequests.map((pr) => pr.login))]

      const analyzed = new Map(
        await Promise.all(
          uniqueLogins.map(
            async (login) =>
              [login, await analyzeAuthor(octokit, login)] as const,
          ),
        ),
      )

      const results = pullRequests
        .map((entry) => {
          const author = analyzed.get(entry.login)

          if (!author) {
            return null
          }

          return {
            ...author,
            prUrl: entry.prUrl,
            prState: entry.state,
          }
        })
        .filter((result) => result !== null)

      results.sort((a, b) => {
        return a.analysis.score - b.analysis.score
      })

      return { pullRequests: results, repo: `${owner}/${repo}` }
    } catch (err: unknown) {
      const error = err as { status?: number; statusCode?: number }
      const status = error.status ?? error.statusCode

      if (status === 403) {
        throw createError({
          statusCode: 429,
          message: 'GitHub API rate limit reached. Please try again later.',
        })
      }

      if (status === 404) {
        throw createError({ statusCode: 404, message: 'Repository not found' })
      }

      throw createError({
        statusCode: 500,
        message: 'Failed to fetch repository data from GitHub',
      })
    }
  },
  {
    maxAge: 60 * 10,
    getKey: (event) => getScanTarget(event)?.path.toLowerCase() ?? 'invalid',
  },
)
