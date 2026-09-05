import type { ActivityHourlyWindowResponse } from '~~/shared/types/logs-api'

export default defineCachedEventHandler(
  async () =>
    fetchFromLogs<ActivityHourlyWindowResponse>('/api/activity/hourly-window'),
  {
    maxAge: 60 * 5,
    getKey: () => currentScanWindow('hour'),
  },
)
