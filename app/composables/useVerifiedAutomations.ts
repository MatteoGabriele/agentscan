export function useVerifiedAutomations() {
  return useAsyncData('verified-list', async () => {
    return $fetch('/api/verified-automations')
  })
}
