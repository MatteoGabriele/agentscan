import type { LibrariesResponse } from '~~/shared/types/logs-api'

export function useLibraries() {
  return useLazyAsyncData(
    'libraries',
    () => {
      return $fetch<LibrariesResponse>('/api/libraries')
    },
    {
      default: (): LibrariesResponse => ({ total: 0, repos: [] }),
      getCachedData: payloadCachedData,
    },
  )
}
