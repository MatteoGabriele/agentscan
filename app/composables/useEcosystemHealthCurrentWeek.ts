export function useEcosystemHealthCurrentWeek() {
  return useAsyncData('ecosystem-health-current-week', async () => {
    return $fetch('/api/health-current-week')
  })
}
