import type { EcosystemHealthDailyResponse } from '~~/shared/types/logs-api'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return fetchFromLogs<EcosystemHealthDailyResponse>('/api/health', {
    query: { full: String(query.full ?? 'false') },
  })
})
