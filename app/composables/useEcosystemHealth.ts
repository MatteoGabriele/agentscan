type UseEcosystemHealthOptions = {
  full?: boolean
  months?: number
}

export function useEcosystemHealth({
  full = false,
  months,
}: UseEcosystemHealthOptions = {}) {
  const key = full
    ? 'ecosystem-health-full'
    : `ecosystem-health-${months ?? 'default'}`

  return useAsyncData(key, async () => {
    return $fetch('/api/health', {
      query: {
        ...(full ? { full } : {}),
        ...(months ? { months } : {}),
      },
    })
  })
}
