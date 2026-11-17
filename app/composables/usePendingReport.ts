export function usePendingReport(
  username: MaybeRefOrGetter<string | null | undefined>,
) {
  const name = computed(() => toValue(username)?.trim().toLowerCase() ?? '')

  return useLazyFetch(
    () => `/api/pending-reports/${encodeURIComponent(name.value)}`,
    {
      key: () => `pending-report:${name.value}`,
      default: () => null,
      enabled: () => !!name.value,
      // A `null` body is sent as 204 No Content, which $fetch parses as `undefined`.
      transform: (report) => report ?? null,
    },
  )
}
