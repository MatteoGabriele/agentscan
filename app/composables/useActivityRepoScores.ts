import type { MaybeRefOrGetter } from 'vue'
import type { ActivityRepoScoresResponse } from '~~/shared/types/logs-api'

type CommonOptions = {
  repo?: MaybeRefOrGetter<string | undefined>
  immediate?: boolean
}

type FullOptions = CommonOptions & {
  full: true
  date?: never
  from?: never
  to?: never
}

type FilteredOptions = CommonOptions & {
  full?: false
  date?: MaybeRefOrGetter<string | undefined>
  from?: MaybeRefOrGetter<string | undefined>
  to?: MaybeRefOrGetter<string | undefined>
}

export type UseActivityRepoScoresOptions = FullOptions | FilteredOptions

export function useActivityRepoScores(
  options: UseActivityRepoScoresOptions = {},
) {
  const query = computed(() => {
    const repo = toValue(options.repo)

    if (options.full) {
      return {
        full: true,
        repo,
      }
    }

    return {
      date: toValue(options.date),
      from: toValue(options.from),
      to: toValue(options.to),
      repo,
    }
  })

  const key = computed(
    () => `activity-repo-scores:${JSON.stringify(query.value)}`,
  )

  return useAsyncData(
    key,
    () =>
      $fetch<ActivityRepoScoresResponse>('/api/activity/repo-scores', {
        query: query.value,
      }),
    {
      immediate: options.immediate ?? true,
    },
  )
}
