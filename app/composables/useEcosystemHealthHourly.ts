export function useEcosystemHealthHourly() {
  return useAsyncData('ecosystem-health-hourly', async () => {
    return $fetch('/api/health/hourly')
  })
}
