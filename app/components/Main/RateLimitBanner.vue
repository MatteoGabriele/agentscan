<script setup lang="ts">
import type { GitHubRateLimitStatus } from '~~/shared/types/github-rate-limit'

// Client-only so a slow status check never holds up the page render.
const { data } = useLazyFetch<GitHubRateLimitStatus>('/api/github/rate-limit', {
  server: false,
})

const resetTime = computed<string | null>(() => {
  const resetAt = data.value?.resetAt
  if (!resetAt) {
    return null
  }

  return new Date(resetAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>

<template>
  <div
    v-if="data?.limited"
    role="status"
    class="flex items-center justify-center gap-2 bg-ui-text px-4 py-2.5 text-center text-sm text-ui-bg text-pretty"
  >
    <span class="i-lucide-triangle-alert size-4 shrink-0" aria-hidden="true" />
    <span>
      <strong class="font-semibold">Oopsie!</strong>
      Everyone is scanning at once and GitHub told us to slow down. New scans
      should work again
      <template v-if="resetTime">around {{ resetTime }}</template>
      <template v-else>shortly</template>.
    </span>
  </div>
</template>
