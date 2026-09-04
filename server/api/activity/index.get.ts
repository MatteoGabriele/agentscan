import type { H3Event } from 'h3'
import type { ActivityDailyResponse } from '~~/shared/types/logs-api'

const fullHistoryFlag = (event: H3Event) => {
  return String(getQuery(event).full ?? 'false')
}

export default defineCachedEventHandler(
  async (event) =>
    fetchFromLogs<ActivityDailyResponse>('/api/activity', {
      query: {
        full: fullHistoryFlag(event),
      },
    }),
  {
    maxAge: 60 * 5,
    getKey: (event) => `${currentScanWindow('day')}-${fullHistoryFlag(event)}`,
  },
)
