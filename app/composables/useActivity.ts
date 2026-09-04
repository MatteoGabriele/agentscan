type UseActivityOptions = {
  full?: boolean
}

export function useActivity({ full = false }: UseActivityOptions = {}) {
  const key = full ? 'activity-full' : 'activity-default'

  return useAsyncData(key, async () => {
    return $fetch('/api/activity', {
      query: {
        full,
      },
    })
  })
}
