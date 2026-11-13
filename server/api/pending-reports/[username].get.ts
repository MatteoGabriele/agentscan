import { findPendingReport } from '~~/shared/utils/pending-reports'
import type { PendingReport } from '~~/shared/utils/pending-reports'

export default defineEventHandler(
  async (event): Promise<PendingReport | null> => {
    const username = getRouterParam(event, 'username')

    if (!username) {
      throw createError({
        statusCode: 400,
        message: 'Missing username parameter',
      })
    }

    const reports = await getPendingReports()

    return findPendingReport(reports, formatUsername(username)) ?? null
  },
)
