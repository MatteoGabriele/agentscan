<script setup lang="ts">
defineProps<{
  onlyLogo?: boolean
}>()

const { trackEvent } = useSaEvent()
</script>

<template>
  <header class="flex justify-between items-center gap-6 px-4 @4xl:px-6 py-4">
    <div class="flex-1">
      <NuxtLink
        class="flex gap-2 items-center text-gh-text"
        to="/"
        aria-label="Homepage"
      >
        <MainLogo size="xs" />
        AgentScan
      </NuxtLink>
    </div>
    <div v-if="!onlyLogo" class="hidden @4xl:block">
      <ul class="flex items-center gap-4">
        <li class="hidden @5xl:block">
          <LazyMainMenuItem to="/" label="Search" />
        </li>
        <li><LazyMainMenuItem to="/health" label="Ecosystem health" /></li>
        <li><LazyMainMenuItem to="/lab" label="The lab" /></li>
        <li><LazyMainMenuItem to="/scan" label="Repository scan" /></li>
        <li>
          <LazyMainMenuItem to="/automations" label="Community reports" />
        </li>
        <li><LazyMainMenuItem to="/bookmarks" label="Bookmarks" /></li>
      </ul>
    </div>

    <div v-if="!onlyLogo" class="flex-1 flex items-center gap-4 justify-end">
      <NuxtLink
        to="/app"
        class="hidden @4xl:inline-flex items-center px-3.5 @4xl:px-2.5 gap-1 py-1 font-medium text-xs rounded-full border border-gh-border/80 text-gh-muted hover:text-gh-text hover:border-gh-border/60 transition-colors whitespace-nowrap"
        title="Install the GitHub App or use the GitHub Action"
        @click="trackEvent('get_agentscan_clicked')"
      >
        <span class="i-lucide-github"></span>
        <span>Get AgentScan</span>
      </NuxtLink>

      <LazyMainMobileMenu hydrate-on-visible class="@4xl:hidden" />
    </div>
  </header>
</template>
