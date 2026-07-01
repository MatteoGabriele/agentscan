import { identify } from '@unveil/identity'
import { isKnownBot } from '~~/shared/cicd-known-bots'
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'
import { MAX_PR_USER_COUNT } from '~~/shared/scan'

const PER_PAGE = 50
const MAX_PAGES = 5
const EVENT_PAGES = 3

type Entry = {
  login: string
  prUrl: string
  authorAssociation: string
}

export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig()
    const query = getQuery(event)
    const repoInput = String(query.repo ?? '')

    if (!repoInput) {
      throw createError({ statusCode: 400, message: 'Missing repo parameter' })
    }

    const parsed = parseRepoSlug(repoInput)
    if (!parsed) {
      throw createError({
        statusCode: 400,
        message:
          'Invalid repository. Expected format: owner/repo or https://github.com/owner/repo',
      })
    }

    const { owner, repo } = parsed
    const octokit = createOctokit(config.githubToken)

    const seenEntries = new Set<string>()
    const entries: Entry[] = []

    try {
      for (
        let page = 1;
        page <= MAX_PAGES && entries.length < MAX_PR_USER_COUNT;
        page++
      ) {
        const { data: prs } = await octokit.rest.pulls.list({
          owner,
          repo,
          state: 'open',
          sort: 'created',
          direction: 'desc',
          per_page: PER_PAGE,
          page,
        })

        for (const pr of prs) {
          if (entries.length >= MAX_PR_USER_COUNT) {
            break
          }
          if (!pr.user?.login) {
            continue
          }
          if (isKnownBot(pr.user.login)) {
            continue
          }

          const lower = pr.user.login.toLowerCase()
          if (seenEntries.has(lower)) {
            continue
          }

          seenEntries.add(lower)
          entries.push({
            login: lower,
            prUrl: pr.html_url,
            authorAssociation: pr.author_association,
          })
        }

        if (prs.length < PER_PAGE) {
          break
        }
      }

      const results = await Promise.all(
        entries.map(async (entry) => {
          const [profileRes, eventResponses] = await Promise.all([
            octokit.rest.users.getByUsername({ username: entry.login }),
            Promise.all(
              Array.from({ length: EVENT_PAGES }, (_, i) =>
                octokit.rest.activity.listPublicEventsForUser({
                  username: entry.login,
                  per_page: 100,
                  page: i + 1,
                }),
              ),
            ),
          ])

          const user = profileRes.data
          const events = eventResponses.flatMap((r) => r.data)

          const analysis = identify({
            accountName: entry.login,
            reposCount: user.public_repos,
            createdAt: user.created_at,
            events,
          })

          return {
            user,
            analysis,
            prUrl: entry.prUrl,
            authorAssociation: entry.authorAssociation,
            eventsCount: events.length,
          }
        }),
      )

      results.sort((a, b) => {
        return a.analysis.score - b.analysis.score
      })

      return { authors: results, repo: `${owner}/${repo}` }
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
    maxAge: 60 * 60 * 2,
    getKey: (event) => {
      const repo = String(getQuery(event).repo ?? '')
      return `scan:${repo}`
    },
  },
)
