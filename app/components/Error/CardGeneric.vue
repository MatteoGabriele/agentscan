<script setup lang="ts">
const props = defineProps<{
  error: unknown
}>()

const errorMessage = computed<string>(() => {
  if (props.error instanceof Error) {
    return props.error.message
  }

  return String(props.error)
})
</script>

<template>
  <div
    class="bg-ui-card p-6 rounded-2 border-2 border-solid border-ui-border text-center"
  >
    <span
      class="i-lucide:badge-x text-xl text-ui-muted mx-auto mb-4 block"
      aria-hidden="true"
    />

    <p class="text-ui-muted">
      {{ errorMessage }}
    </p>
  </div>
</template>
