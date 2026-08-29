import type { ActionRepository } from '~~/shared/types/action-repository'

export function useActionRepositories() {
  return useLazyAsyncData('action-repositories', () => {
    return $fetch<ActionRepository[]>('/api/action-repositories')
  })
}
