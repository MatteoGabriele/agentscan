export function useVerifiedAutomations() {
  // Reused across navigations; the list only changes on deploy.
  return useAsyncData(
    'verified-list',
    async () => {
      return $fetch('/api/verified-automations')
    },
    {
      getCachedData: payloadCachedData,
    },
  )
}
