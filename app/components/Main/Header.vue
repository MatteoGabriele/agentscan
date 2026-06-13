<script setup lang="ts">
const route = useRoute();
const isHomePage = computed<boolean>(() => route.name === "index");
</script>

<template>
  <header class="h-12 flex justify-between items-center px-4 lg:px-6 py-4">
    <div class="flex-1">
      <NuxtLink
        v-if="!isHomePage"
        class="flex gap-2 items-center text-gh-text"
        to="/"
        aria-label="Homepage"
      >
        <MainLogo size="xs" />
        AgentScan
      </NuxtLink>
    </div>
    <div class="hidden md:block">
      <ul class="flex items-center gap-4">
        <li><MainMenuItem to="/health" label="Ecosystem health" /></li>
        <li><MainMenuItem to="/lab" label="The lab" /></li>
        <li><MainMenuItem to="/automations" label="Community flags" /></li>
        <li><MainMenuItem to="/detected-automations" label="Daily flags" /></li>
      </ul>
    </div>

    <div class="flex-1 flex items-center gap-4 justify-end">
      <NuxtLink
        external
        target="_blank"
        to="https://github.com/marketplace/actions/agentscan"
        class="hidden md:inline-flex items-center px-3.5 lg:px-2.5 gap-1 py-1 font-medium text-xs rounded-full border border-gh-border/80 text-gh-muted hover:text-gh-text hover:border-gh-border/60 transition-colors whitespace-nowrap"
        title="Use it as a GitHub Action"
      >
        <span class="i-lucide:git-fork"></span>
        <span>GitHub action</span>
      </NuxtLink>

      <MainMobileMenu class="md:hidden" />
    </div>
  </header>
</template>
