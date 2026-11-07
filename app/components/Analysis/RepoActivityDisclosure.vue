<script setup lang="ts">
import type { RepoEvent } from '~/utils/repo-activity'

const props = defineProps<{
  events: RepoEvent[]
  /** GitHub API response the events came from. */
  rawEventsUrl?: string
}>()

const MAX_PREVIEW_OWNERS = 3

const isOpen = ref(false)
const panelId = useId()

const repos = computed(() => groupEventsByRepo(props.events))

const busiestRepo = computed<string | undefined>(() => repos.value[0]?.repo)

// Owners of the busiest repositories, shown as a teaser of what's inside.
const previewOwners = computed<string[]>(() => {
  const owners = repos.value.map(({ repo }) => repo.split('/')[0] ?? '')
  return [...new Set(owners)].filter(Boolean).slice(0, MAX_PREVIEW_OWNERS)
})

const subtitle = computed<string>(() => {
  const count = repos.value.length
  if (count === 1) {
    return `All in ${busiestRepo.value}`
  }
  return `${count} repositories, most active in ${busiestRepo.value}`
})

function avatarUrl(owner: string): string {
  return `https://avatars.githubusercontent.com/${encodeURIComponent(owner)}?size=48`
}
</script>

<template>
  <div
    class="rounded-lg border-1 border-solid border-ui-border/50 transition-colors"
    :class="
      isOpen ? 'bg-ui-muted/5' : 'hover:border-ui-border hover:bg-ui-muted/5'
    "
  >
    <button
      class="group w-full flex items-center gap-3 px-4 py-3 text-left"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="isOpen = !isOpen"
    >
      <span class="hidden sm:flex shrink-0 items-center" aria-hidden="true">
        <img
          v-for="owner in previewOwners"
          :key="owner"
          :src="avatarUrl(owner)"
          alt=""
          loading="lazy"
          width="24"
          height="24"
          class="size-6 -mr-1.5 last:mr-0 rounded-full bg-ui-card ring-2 ring-ui-card filter-saturate-0 transition-all group-hover:filter-saturate-100"
        />
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-sm text-ui-text">
          See where this account has been active
        </span>
        <span class="block truncate text-xs text-ui-muted">
          {{ subtitle }}
        </span>
      </span>

      <span
        class="i-lucide:chevron-down shrink-0 text-ui-muted transition-all group-hover:text-ui-text"
        :class="isOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'"
        aria-hidden="true"
      />
    </button>

    <AnalysisRepoActivityPanel
      v-if="isOpen"
      :id="panelId"
      :events
      :raw-events-url
      class="mx-4 mb-3 pt-3 border-t border-ui-border-subtle/40"
    />
  </div>
</template>
