<script setup lang="ts">
const props = defineProps<{
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>()

const sizeMap = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 48,
}

const logoSize = computed(() => sizeMap[props.size || 'md'])
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="logoSize"
    :height="logoSize"
    viewBox="0 0 32 32"
  >
    <path
      fill="currentColor"
      d="M21 29H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16v2H5v22h16Z"
    />
    <path fill="currentColor" d="M15 9h2v14h-2zm12 0h2v14h-2zm-6 0h2v14h-2z" />
  </svg>
</template>
