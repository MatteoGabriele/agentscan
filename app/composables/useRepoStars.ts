export function useRepoStars() {
  return useAsyncData('repo-stars', () => $fetch('/api/repo-stars'))
}
