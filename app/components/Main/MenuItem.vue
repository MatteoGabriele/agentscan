<script setup lang="ts">
const props = defineProps<{
  label: string
  to: string
  exact?: boolean
  badge?: string
}>()

const route = useRoute()
const isExternal = computed<boolean>(() => props.to.startsWith('http'))
const isPathActive = computed(() => {
  const isExact = props.exact || props.to === '/'

  return isExact ? route.path === props.to : route.path.startsWith(props.to)
})
</script>

<template>
  <NuxtLink
    :to
    class="inline-flex items-center gap-2 text-ui-muted hover:text-ui-text transition-colors text-sm"
  >
    <span
      class="text-ui-muted hover:text-ui-text transition-colors"
      :class="{ 'text-ui-text': isPathActive }"
    >
      {{ label }}
    </span>
    <span
      v-if="badge"
      class="shrink-0 px-1.5 py-0.5 rounded-full border border-solid border-ui-border text-10px font-medium uppercase tracking-wider text-ui-muted leading-none"
      >{{ badge }}</span
    >
    <span
      v-if="isExternal"
      class="i-lucide:external-link text-[0.7em] opacity-60 shrink-0"
      aria-hidden="true"
    ></span>
  </NuxtLink>
</template>
