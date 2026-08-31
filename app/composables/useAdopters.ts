import type { AdopterRepository } from '~~/shared/types/adopter-repository'

export function useAdopters() {
  return useLazyAsyncData(
    'adopters',
    () => {
      return $fetch<AdopterRepository[]>('/api/adopters')
    },
    {
      getCachedData: payloadCachedData,
    },
  )
}
