export const VERIFIED_AUTOMATION_CACHE_KEY = 'verified-list'

export function useVerifiedAutomations() {
  return useAsyncData(
    VERIFIED_AUTOMATION_CACHE_KEY,
    async () => {
      return $fetch('/api/verified-automations')
    },
    {
      getCachedData: payloadCachedData,
    },
  )
}
