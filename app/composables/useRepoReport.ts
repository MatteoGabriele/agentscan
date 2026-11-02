import type { RepoReport } from '~~/shared/types/repo-report'

export function useRepoReport(repo: MaybeRefOrGetter<string>) {
  return useAsyncData(
    () => `repo-report:${toValue(repo).toLowerCase()}`,
    () =>
      $fetch<RepoReport>('/api/activity/repo-report', {
        query: { repo: toValue(repo) },
      }),
  )
}
