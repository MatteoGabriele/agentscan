import type { RepoReport } from '~~/shared/types/repo-report'

export function useRepoReport(repo: MaybeRefOrGetter<string>) {
  return useAsyncData(
    () => `repo-report:${toValue(repo).toLowerCase()}`,
    () => {
      const slug = toValue(repo)

      // Nothing to look up, as for a path that isn't owner/name.
      if (!slug) {
        return Promise.resolve(null)
      }

      return $fetch<RepoReport>('/api/activity/repo-report', {
        query: { repo: slug },
      })
    },
  )
}
