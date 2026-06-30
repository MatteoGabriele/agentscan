<script setup lang="ts">
const props = defineProps<{
  label: string
  to: string
}>()

const route = useRoute()
const isPathActive = computed(() => {
  return props.to === '/' ? route.path === '/' : route.path.startsWith(props.to)
})
</script>

<template>
  <NuxtLink
    :to
    class="inline-flex items-center text-gh-muted hover:text-gh-text transition-colors text-sm"
  >
    <span
      class="text-gh-muted hover:text-gh-text transition-colors"
      :class="{ 'text-gh-text': isPathActive }"
    >
      {{ label }}
    </span>
  </NuxtLink>
</template>
