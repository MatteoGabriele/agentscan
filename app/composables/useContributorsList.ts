import type { RepositoryContributors } from '~~/shared/types/contributor'

export async function useContributorsList() {
  return useAsyncData(
    'contributors-list',
    () => $fetch<RepositoryContributors[]>('/api/contributors'),
    {
      getCachedData: payloadCachedData,
    },
  )
}
