import type { ActivityHourlyWindowResponse } from '~~/shared/types/logs-api'
import { parseRepoSlug } from '~~/shared/utils/parse-repo-slug'
import { findRepoName, getRepoReport } from '~~/shared/utils/repo-report'

function getRepoQuery(event: Parameters<typeof getQuery>[0]): string {
  const { repo } = getQuery(event)

  return typeof repo === 'string' ? (parseRepoSlug(repo)?.path ?? '') : ''
}

// Composed here rather than in the browser: the full repo score history holds
// every tracked repo and weighs about 1MB.
export default defineCachedEventHandler(
  async (event) => {
    const repo = getRepoQuery(event)

    if (!repo) {
      throw createError({
        statusCode: 400,
        message: 'Expected a repo query in the form owner/repo',
      })
    }

    const [days, window] = await Promise.all([
      getRepoScoreHistory(),
      // Internal call, so it reuses the hourly window route's cache.
      $fetch<ActivityHourlyWindowResponse>('/api/activity/hourly-window'),
    ])

    const name = findRepoName({
      repo,
      days,
      results: window.results,
    })

    if (!name) {
      throw createError({
        statusCode: 404,
        message: `${repo} is not a tracked repository`,
      })
    }

    return getRepoReport({
      repo: name,
      days,
      results: window.results,
    })
  },
  {
    maxAge: 60 * 5,
    getKey: (event) =>
      [currentScanWindow('hour'), getRepoQuery(event).toLowerCase()].join(':'),
  },
)
