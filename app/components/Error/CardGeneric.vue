<script setup lang="ts">
const props = defineProps<{
  error: unknown
  retry?: (() => unknown) | null
  // Optional copy for pages that do not load an account.
  // When `description` is set, the default hint is dropped too,
  // because it talks about accounts.
  title?: string
  description?: string
  hint?: string
}>()

const { errorDetails } = useErrorDetails(() => props.error)

const retryHandler = computed<(() => unknown) | null>(() => {
  if (!errorDetails.value.canRetry) {
    return null
  }

  return props.retry ?? (() => reloadNuxtApp())
})
</script>

<template>
  <ErrorCard
    :icon="errorDetails.icon"
    :tone="errorDetails.tone"
    :title="title ?? errorDetails.title"
    :description="description ?? errorDetails.description"
    :hint="description ? hint : errorDetails.hint"
    :status-code="errorDetails.statusCode"
    :detail="errorDetails.detail"
    :retry="retryHandler"
  />
</template>
