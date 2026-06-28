export function useDetectedAutomations() {
  return useAsyncData('detected-automations', async () => {
    return $fetch('/api/detected-automations')
  })
}
