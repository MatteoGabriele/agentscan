import type { H3Event } from 'h3'
import type {
  ActivityRepoScoresDatesResponse,
  ActivityRepoScoresRangeResponse,
  ActivityRepoScoresResponse,
} from '~~/shared/types/logs-api'

type RepoScoresQuery = {
  full: boolean
  date?: string
  from?: string
  to?: string
  repo?: string
}

function getStringQueryValue(value: unknown) {
  return typeof value === 'string' && value.length ? value : undefined
}

function getRepoScoresQuery(event: H3Event): RepoScoresQuery {
  const query = getQuery(event)

  return {
    full: query.full === 'true' || query.full === '1',
    date: getStringQueryValue(query.date),
    from: getStringQueryValue(query.from),
    to: getStringQueryValue(query.to),
    repo: getStringQueryValue(query.repo),
  }
}

function getUpstreamQuery(query: RepoScoresQuery) {
  return {
    date: query.date,
    from: query.from,
    to: query.to,
    repo: query.repo,
  }
}

export default defineCachedEventHandler(
  async (event) => {
    const query = getRepoScoresQuery(event)

    if (query.full && (query.date || query.from || query.to)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'full cannot be combined with date, from, or to',
      })
    }

    if (query.date && (query.from || query.to)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'date cannot be combined with from or to',
      })
    }

    if (!query.full) {
      return fetchFromLogs<ActivityRepoScoresResponse>(
        '/api/activity/repo-scores',
        {
          query: getUpstreamQuery(query),
        },
      )
    }

    const available = await fetchFromLogs<ActivityRepoScoresDatesResponse>(
      '/api/activity/repo-scores',
      {
        query: {
          repo: query.repo,
        },
      },
    )

    const dates = [...available.dates].sort()

    if (!dates.length) {
      return {
        from: '',
        to: '',
        dates: [],
        days: [],
      } satisfies ActivityRepoScoresRangeResponse
    }

    const from = dates[0]!
    const to = dates.at(-1)!

    return fetchFromLogs<ActivityRepoScoresRangeResponse>(
      '/api/activity/repo-scores',
      {
        query: {
          from,
          to,
          repo: query.repo,
        },
      },
    )
  },
  {
    maxAge: 60 * 5,
    getKey: (event) => {
      const { full, date, from, to, repo } = getRepoScoresQuery(event)

      return [
        currentScanWindow('day'),
        full ? 'full' : 'filtered',
        date ?? '',
        from ?? '',
        to ?? '',
        repo ?? '',
      ].join(':')
    },
  },
)
