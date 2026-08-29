<script setup lang="ts">
defineProps<{
  label: string
}>()
</script>

<template>
  <span class="relative inline-flex group/tooltip">
    <slot />

    <span
      v-if="label"
      role="tooltip"
      class="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 pointer-events-none whitespace-nowrap rounded-2 border-1 border-solid border-ui-border/60 bg-ui-card px-2 py-1 text-xs font-medium text-ui-text opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
    >
      {{ label }}
    </span>
  </span>
</template>
