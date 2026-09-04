import type { ActivityTrmnlResponse } from '~~/shared/types/logs-api'

export default defineCachedEventHandler(
  async () => fetchFromLogs<ActivityTrmnlResponse>('/api/activity/trmnl'),
  {
    maxAge: 60 * 5,
    getKey: () => currentScanWindow('day'),
  },
)
