<script setup lang="ts">
defineProps<{
  time: string
}>()
</script>

<template>
  <div
    class="rounded border border-gh-danger-hover/30 bg-gh-danger-hover/5 px-3 py-2.5 space-y-2"
  >
    <div
      class="flex items-center gap-1.5 text-gh-danger-hover text-xs font-medium"
    >
      <span class="i-lucide:zap shrink-0" />
      <span>Fastest · {{ time }}</span>
    </div>
    <slot />
  </div>
</template>
