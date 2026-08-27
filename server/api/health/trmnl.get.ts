import type { EcosystemHealthTrmnlResponse } from '~~/shared/types/logs-api'

export default defineEventHandler(async () => {
  return fetchFromLogs<EcosystemHealthTrmnlResponse>('/api/health/trmnl')
})
