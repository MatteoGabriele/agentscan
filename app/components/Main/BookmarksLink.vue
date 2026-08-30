<script setup lang="ts">
const route = useRoute()
const isPathActive = computed(() => route.path.startsWith('/bookmarks'))
</script>

<template>
  <Tooltip label="Bookmarks" position="bottom">
    <NuxtLink
      to="/bookmarks"
      title="Bookmarks"
      aria-label="Bookmarks"
      class="inline-flex items-center justify-center size-6.5 rounded-full border border-solid border-ui-border/80 text-ui-muted hover:text-ui-text hover:border-ui-border/60 transition-colors"
      :class="{ 'text-ui-text': isPathActive }"
    >
      <span class="i-lucide:bookmark text-xs"></span>
    </NuxtLink>
  </Tooltip>
</template>
