import type { EcosystemHealthTrmnlResponse } from '~~/shared/types/logs-api'

export default defineCachedEventHandler(
  async () =>
    fetchFromLogs<EcosystemHealthTrmnlResponse>('/api/activity/trmnl'),
  {
    maxAge: 60 * 5,
    getKey: () => currentScanWindow('day'),
  },
)
