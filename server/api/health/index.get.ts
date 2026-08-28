import type { H3Event } from 'h3'
import type { EcosystemHealthDailyResponse } from '~~/shared/types/logs-api'

const fullHistoryFlag = (event: H3Event) => {
  return String(getQuery(event).full ?? 'false')
}

export default defineCachedEventHandler(
  async (event) =>
    fetchFromLogs<EcosystemHealthDailyResponse>('/api/health', {
      query: {
        full: fullHistoryFlag(event),
      },
    }),
  {
    maxAge: 60 * 5,
    getKey: (event) => `${currentScanWindow('day')}-${fullHistoryFlag(event)}`,
  },
)
