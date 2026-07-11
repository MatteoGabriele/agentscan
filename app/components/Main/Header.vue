<script setup lang="ts">
defineProps<{
  onlyLogo?: boolean
}>()
</script>

<template>
  <header
    class="h-12 flex justify-between items-center gap-6 px-4 @4xl:px-6 py-4"
  >
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
          <MainMenuItem to="/" label="Search" />
        </li>
        <li><MainMenuItem to="/health" label="Ecosystem health" /></li>
        <li><MainMenuItem to="/lab" label="The lab" /></li>
        <li><MainMenuItem to="/scan" label="Repository scan" /></li>
        <li><MainMenuItem to="/automations" label="Community reports" /></li>
        <li><MainMenuItem to="/bookmarks" label="Bookmarks" /></li>
      </ul>
    </div>

    <div v-if="!onlyLogo" class="flex-1 flex items-center gap-4 justify-end">
      <NuxtLink
        to="/app"
        class="hidden @4xl:inline-flex items-center px-3.5 @4xl:px-2.5 gap-1 py-1 font-medium text-xs rounded-full border border-gh-border/80 text-gh-muted hover:text-gh-text hover:border-gh-border/60 transition-colors whitespace-nowrap"
        title="Install the GitHub App or use the GitHub Action"
      >
        <span class="i-lucide-github"></span>
        <span>Get AgentScan</span>
      </NuxtLink>

      <MainMobileMenu class="@4xl:hidden" />
    </div>
  </header>
</template>
