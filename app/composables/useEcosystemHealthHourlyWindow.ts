export function useEcosystemHealthHourlyWindow() {
  return useAsyncData('ecosystem-health-hourly-window', async () => {
    return $fetch('/api/health/hourly-window')
  })
}
