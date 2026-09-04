type UseEcosystemHealthOptions = {
  full?: boolean
}

export function useEcosystemHealth({
  full = false,
}: UseEcosystemHealthOptions = {}) {
  const key = full ? 'ecosystem-health-full' : 'ecosystem-health-default'

  return useAsyncData(key, async () => {
    return $fetch('/api/activity', {
      query: {
        full,
      },
    })
  })
}
