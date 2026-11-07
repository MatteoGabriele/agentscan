import type {
  ActivityRepoScoreDay,
  ActivityRepoScoresDatesResponse,
  ActivityRepoScoresRangeResponse,
} from '~~/shared/types/logs-api'

/**
 * Every day of per-repo scores agentscan-logs holds, for all repos. Upstream
 * has no "everything" query, so the available dates are read first and then
 * requested as one range.
 */
export const getRepoScoreHistory = defineCachedFunction(
  async (): Promise<ActivityRepoScoreDay[]> => {
    const { dates } = await fetchFromLogs<ActivityRepoScoresDatesResponse>(
      '/api/activity/repo-scores',
    )

    const sorted = [...dates].sort()
    const from = sorted[0]
    const to = sorted.at(-1)

    if (!from || !to) {
      return []
    }

    const { days } = await fetchFromLogs<ActivityRepoScoresRangeResponse>(
      '/api/activity/repo-scores',
      { query: { from, to } },
    )

    return days
  },
  {
    name: 'repo-score-history',
    maxAge: 60 * 5,
    getKey: () => currentScanWindow('day'),
  },
)
