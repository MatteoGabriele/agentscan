import type { ReportIssue } from '~~/shared/utils/report-issues'

export default defineCachedEventHandler(
  async (event): Promise<ReportIssue[]> => {
    const username = getRouterParam(event, 'username')

    if (!username) {
      throw createError({
        statusCode: 400,
        message: 'Missing username parameter',
      })
    }

    const user = await $fetch(`/api/account/${encodeURIComponent(username)}`)

    return getReportIssues(user.id)
  },
  {
    name: 'report-issues',
    maxAge: 60 * 5,
    getKey: (event) => getRouterParam(event, 'username')?.toLowerCase() ?? '',
  },
)
