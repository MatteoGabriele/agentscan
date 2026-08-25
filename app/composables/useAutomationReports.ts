export function useAutomationReports() {
  return useAsyncData('automation-reports', async () => {
    return $fetch('/api/verified-automations')
  })
}
