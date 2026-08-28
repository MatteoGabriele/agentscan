import type { EcosystemHealthHourlyWindowResponse } from '~~/shared/types/logs-api'

export default defineCachedEventHandler(
  async () =>
    fetchFromLogs<EcosystemHealthHourlyWindowResponse>(
      '/api/health/hourly-window',
    ),
  {
    maxAge: 60 * 5,
    getKey: () => currentScanWindow('hour'),
  },
)
