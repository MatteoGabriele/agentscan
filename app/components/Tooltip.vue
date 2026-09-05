<script setup lang="ts">
const { position = 'top', wide = false } = defineProps<{
  label: string
  position?: 'top' | 'bottom'
  wide?: boolean
}>()

const positionClasses = computed<string>(() => {
  if (position === 'top') {
    return 'bottom-full mb-2'
  }

  return 'top-full mt-2'
})

const widthClasses = computed<string>(() => {
  if (wide) {
    return 'w-60 whitespace-normal text-pretty leading-relaxed'
  }

  return 'whitespace-nowrap'
})
</script>

<template>
  <span class="relative inline-flex group/tooltip">
    <slot />

    <span
      v-if="label"
      role="tooltip"
      class="absolute left-1/2 z-20 -translate-x-1/2 pointer-events-none rounded-2 border-1 border-solid border-ui-border/60 bg-ui-card px-2 py-1 text-xs font-medium text-ui-text opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      :class="[positionClasses, widthClasses]"
    >
      {{ label }}
    </span>
  </span>
</template>
