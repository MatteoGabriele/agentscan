import type { LibrariesResponse } from '~~/shared/types/logs-api'

export default defineCachedEventHandler(
  () => fetchFromLogs<LibrariesResponse>('/api/libraries'),
  {
    maxAge: 60 * 60 * 24,
  },
)
