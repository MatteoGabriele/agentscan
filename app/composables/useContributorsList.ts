import type { ContributorsResponse } from '~~/shared/types/contributor'

export async function useContributorsList() {
  return useAsyncData(
    'contributors',
    () => $fetch<ContributorsResponse>('/api/contributors'),
    {
      getCachedData: payloadCachedData,
    },
  )
}
