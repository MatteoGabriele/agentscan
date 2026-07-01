export function useBountyRepos() {
  return useAsyncData('bounty-repos', async () => {
    return $fetch<BountyRepo[]>('/api/bounty-repos')
  })
}
