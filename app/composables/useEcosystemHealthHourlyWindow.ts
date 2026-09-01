type UseEcosystemHealthHourlyWindowOptions = {
  immediate?: boolean
}

export function useEcosystemHealthHourlyWindow({
  immediate = true,
}: UseEcosystemHealthHourlyWindowOptions = {}) {
  return useAsyncData(
    'ecosystem-health-hourly-window',
    async () => {
      return $fetch('/api/health/hourly-window')
    },
    { immediate },
  )
}
