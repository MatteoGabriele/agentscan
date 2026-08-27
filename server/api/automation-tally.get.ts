import type { AutomationTallyResponse } from '~~/shared/types/logs-api'

export default defineEventHandler(async () => {
  return fetchFromLogs<AutomationTallyResponse>('/api/automation-tally')
})
