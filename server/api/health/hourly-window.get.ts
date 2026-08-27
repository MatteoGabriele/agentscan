import type { EcosystemHealthHourlyWindowResponse } from '~~/shared/types/logs-api'

export default defineEventHandler(async () => {
  return fetchFromLogs<EcosystemHealthHourlyWindowResponse>(
    '/api/health/hourly-window',
  )
})
