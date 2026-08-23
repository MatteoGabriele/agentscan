<script setup lang="ts">
const props = defineProps<{
  error: unknown
  retry?: (() => unknown) | null
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
    :title="errorDetails.title"
    :description="errorDetails.description"
    :hint="errorDetails.hint"
    :status-code="errorDetails.statusCode"
    :detail="errorDetails.detail"
    :retry="retryHandler"
  />
</template>
