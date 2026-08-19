export function useAutomationTally() {
  return useAsyncData('automation-tally', async () => {
    return $fetch('/api/automation-tally')
  })
}
