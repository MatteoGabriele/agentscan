// The day-by-day rollup derived from the hourly window. It carries the same
// aggregate shape as `useEcosystemHealth` — `countsByDate`, `dates`,
// `scanTimes`, `categoryProgression` — but no `results`: a stored day is counts
// only, with no rows behind it. Charts that read individual PRs have to stay on
// `useEcosystemHealth`.
export function useEcosystemHealthDaily() {
  return useAsyncData('ecosystem-health-daily', async () => {
    return $fetch('/api/health/daily')
  })
}
