<script setup lang="ts">
const { position = 'top' } = defineProps<{
  label: string
  position?: 'top' | 'bottom'
}>()

const positionClasses = computed<string>(() => {
  if (position === 'top') {
    return 'bottom-full mb-2'
  }

  return 'top-full mt-2'
})
</script>

<template>
  <span class="relative inline-flex group/tooltip">
    <slot />

    <span
      v-if="label"
      role="tooltip"
      class="absolute left-1/2 z-20 -translate-x-1/2 pointer-events-none whitespace-nowrap rounded-2 border-1 border-solid border-ui-border/60 bg-ui-card px-2 py-1 text-xs font-medium text-ui-text opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      :class="positionClasses"
    >
      {{ label }}
    </span>
  </span>
</template>
