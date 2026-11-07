<script setup lang="ts">
import type { EventCategory, RepoEvent } from '~/utils/repo-activity'

const props = withDefaults(
  defineProps<{
    events: RepoEvent[]
    previewCount?: number
    /** GitHub API response the events came from. */
    rawEventsUrl?: string
  }>(),
  { previewCount: 5, rawEventsUrl: undefined },
)

const category = ref<EventCategory | 'all'>('all')

const categoryOptions = computed(() => {
  const categories = getEventCategories(props.events)
  if (!categories.length) {
    return []
  }
  return [
    {
      value: 'all' as const,
      label: 'All',
    },
    ...categories,
  ]
})

const repos = computed(() => {
  const selected = category.value === 'all' ? undefined : category.value
  return groupEventsByRepo(filterByCategory(props.events, selected))
})

const { visibleItems, canToggle, toggleLabel, toggle } = usePreviewList(
  repos,
  props.previewCount,
)

// Tracked repositories have their own activity page. The libraries list is
// lowercase, so the match ignores case.
const { data: libraries } = useLibraries()
const trackedRepos = computed<Map<string, string>>(() => {
  return new Map(
    libraries.value.repos.map((repo) => [repo.toLowerCase(), repo]),
  )
})

function getActivityPath(repo: string): string | undefined {
  const tracked = trackedRepos.value.get(repo.toLowerCase())
  return tracked ? `/activity/${tracked}` : undefined
}
</script>

<template>
  <div>
    <Toggle
      v-if="categoryOptions.length"
      v-model="category"
      :options="categoryOptions"
      label="Filter by event type"
    />

    <ul class="mt-1">
      <AnalysisRepoActivityItem
        v-for="activity in visibleItems"
        :key="activity.repo"
        :activity
        :activity-path="getActivityPath(activity.repo)"
      />
    </ul>

    <div
      v-if="canToggle || rawEventsUrl"
      class="mt-2 flex flex-wrap items-center justify-between gap-2"
    >
      <button
        v-if="canToggle"
        class="text-ui-muted text-xs hover:text-ui-text transition-colors"
        @click="toggle"
      >
        {{ toggleLabel }}
      </button>
      <NuxtLink
        v-if="rawEventsUrl"
        :to="rawEventsUrl"
        target="_blank"
        external
        class="ml-auto inline-flex items-center gap-1 text-xs text-ui-muted hover:text-ui-text transition-colors"
      >
        Raw events from GitHub
        <span class="i-lucide:arrow-up-right shrink-0" aria-hidden="true" />
      </NuxtLink>
    </div>
  </div>
</template>
