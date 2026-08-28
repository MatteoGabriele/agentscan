<script setup lang="ts">
import type { MenuDropdownItem } from '~~/shared/types/menu'

defineProps<{
  onlyLogo?: boolean
}>()

const { trackEvent } = useSaEvent()

const scanItems: MenuDropdownItem[] = [
  {
    to: '/',
    label: 'Account search',
    description: "Analyze a GitHub account's activity",
    icon: 'i-lucide:search',
  },
  {
    to: '/scan',
    label: 'Repository scan',
    description: 'Recent PR authors of any public repository',
    icon: 'i-lucide:scan-search',
  },
  {
    to: '/automations',
    label: 'Community reports',
    description: 'Automations flagged by the community',
    icon: 'i-lucide:flag',
  },
]
</script>

<template>
  <header class="flex justify-between items-center gap-6 px-4 @4xl:px-6 py-4">
    <div class="flex-1">
      <NuxtLink
        class="flex gap-2 items-center text-ui-text"
        to="/"
        aria-label="Homepage"
      >
        <MainLogo size="xs" />
        AgentScan
      </NuxtLink>
    </div>
    <div v-if="!onlyLogo" class="hidden @4xl:block">
      <ul class="flex items-center gap-5">
        <li>
          <LazyMainMenuDropdown label="Scan" :items="scanItems" />
        </li>
        <li><LazyMainMenuItem to="/health" label="Ecosystem health" /></li>
        <li><LazyMainMenuItem to="/lab" label="The lab" /></li>
        <li><LazyMainMenuItem to="/bookmarks" label="Bookmarks" /></li>
        <li>
          <LazyMainMenuItem
            to="/app"
            label="Install AgentScan"
            @click="trackEvent('get_agentscan_clicked')"
          />
        </li>
      </ul>
    </div>

    <div v-if="!onlyLogo" class="flex-1 flex items-center gap-4 justify-end">
      <LazyMainGithubStars hydrate-on-visible />

      <LazyMainMobileMenu hydrate-on-visible class="@4xl:hidden" />
    </div>
  </header>
</template>
