type UseActivityHourlyWindowOptions = {
  immediate?: boolean
}

export function useActivityHourlyWindow({
  immediate = true,
}: UseActivityHourlyWindowOptions = {}) {
  return useAsyncData(
    'activity-hourly-window',
    async () => {
      return $fetch('/api/activity/hourly-window')
    },
    { immediate },
  )
}
