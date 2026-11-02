<script setup lang="ts">
const props = defineProps<{
  label: string
  to: string
  exact?: boolean
}>()

const route = useRoute()
const isPathActive = computed(() => {
  const isExact = props.exact || props.to === '/'

  return isExact ? route.path === props.to : route.path.startsWith(props.to)
})
</script>

<template>
  <NuxtLink
    :to
    class="inline-flex items-center text-ui-muted hover:text-ui-text transition-colors text-sm"
  >
    <span
      class="text-ui-muted hover:text-ui-text transition-colors"
      :class="{ 'text-ui-text': isPathActive }"
    >
      {{ label }}
    </span>
  </NuxtLink>
</template>
