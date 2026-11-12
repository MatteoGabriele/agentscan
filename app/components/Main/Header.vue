<script setup lang="ts">
import type { MenuDropdownItem, MenuSection } from '~~/shared/types/menu'

defineProps<{
  onlyLogo?: boolean
}>()

const route = useRoute()
const isBookmarksPage = computed<boolean>(() => route.path === '/bookmarks')

const scanItems: MenuDropdownItem[] = [
  {
    to: '/',
    label: 'Account search',
    description: "Analyze a GitHub account's activity",
    icon: 'i-lucide:user-search',
  },
  {
    to: '/scan',
    label: 'Repository scan',
    description: 'Recent PR authors of any public repository',
    icon: 'i-lucide:book-search',
  },
  {
    to: 'https://text.agentscan.tools',
    label: 'Text',
    description: 'Find signs of AI-written text in open source contributions',
    icon: 'i-agentscan:text',
    badge: 'Beta',
  },
  {
    to: '/lab',
    label: 'The Lab',
    description: 'Experimental account scan mapping',
    icon: 'i-lucide:flask-conical',
  },
]

const activityItems: MenuDropdownItem[] = [
  {
    to: '/activity',
    label: 'Overview',
    description: 'Contribution patterns across the tracked repositories',
    icon: 'i-lucide:activity',
    exact: true,
  },
  {
    to: '/activity/repositories',
    label: 'Repositories',
    description: 'Browse the tracked repositories by category',
    icon: 'i-lucide:library',
  },
]

const communityItems: MenuDropdownItem[] = [
  {
    to: '/contribute',
    label: 'Contribute',
    description: 'Ways to help the AgentScan ecosystem',
    icon: 'i-lucide:book-heart',
  },
  {
    to: '/automations',
    label: 'Community reports',
    description: 'Automations flagged by the community',
    icon: 'i-lucide:clipboard-pen',
  },
  {
    to: '/adopters',
    label: 'Used by',
    description: 'Public repositories running AgentScan on their CI',
    icon: 'i-lucide:heart-handshake',
  },
  {
    to: 'https://github.com/MatteoGabriele/agentscan',
    label: 'Source',
    description: 'Browse the code and open issues on GitHub',
    icon: 'i-lucide:code-xml',
  },
]

const installItems: MenuDropdownItem[] = [
  {
    to: '/app',
    label: 'GitHub App',
    description: 'Install on your repositories, no setup needed',
    icon: 'i-lucide:github',
  },
  {
    to: 'https://github.com/marketplace/actions/agentscan',
    label: 'GitHub Action',
    description: 'Run it in your own workflow',
    icon: 'i-lucide:workflow',
  },
  {
    to: '/app#configure',
    label: 'Configure',
    description: 'Labels, comments, auto-close and trusted users',
    icon: 'i-lucide:settings-2',
  },
]

const sections: MenuSection[] = [
  { key: 'scan', label: 'Scan', items: scanItems },
  { key: 'activity', label: 'Ecosystem Activity', items: activityItems },
  { key: 'community', label: 'Community', items: communityItems },
  { key: 'install', label: 'Install AgentScan', items: installItems },
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
      </NuxtLink>
    </div>
    <div v-if="!onlyLogo" class="hidden @4xl:block">
      <MainNavMenu :sections="sections" />
    </div>

    <div v-if="!onlyLogo" class="flex-1 flex items-center gap-3 justify-end">
      <div class="flex items-center gap-1">
        <!-- The mobile menu already lists Bookmarks. -->
        <NuxtLink
          to="/bookmarks"
          aria-label="Bookmarks"
          title="Bookmarks"
          class="hidden @4xl:grid size-8 place-items-center rounded-full transition-colors hover:bg-ui-muted/10 hover:text-ui-text"
          :class="
            isBookmarksPage ? 'bg-ui-muted/10 text-ui-text' : 'text-ui-muted'
          "
        >
          <span class="i-lucide:bookmark" aria-hidden="true"></span>
        </NuxtLink>

        <MainThemeToggle />
      </div>

      <LazyMainMobileMenu hydrate-on-visible class="@4xl:hidden" />
    </div>
  </header>
</template>
