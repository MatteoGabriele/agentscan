<script setup lang="ts">
import type { GitHubEvent } from '@unveil/identity/providers/github'
import type { EventCategory } from '~/utils/repo-activity'

const props = defineProps<{
  events: GitHubEvent[]
}>()

const isExpanded = ref(false)
const category = ref<EventCategory | 'all'>('all')

const categoryOptions = computed(() => {
  const categories = getEventCategories(props.events)
  if (!categories.length) {
    return []
  }
  return [{ value: 'all' as const, label: 'All' }, ...categories]
})

const repoCount = computed<number>(() => {
  return groupEventsByRepo(props.events).length
})

const repos = computed(() => {
  const selected = category.value === 'all' ? undefined : category.value
  return groupEventsByRepo(filterByCategory(props.events, selected))
})

const { visibleItems, canToggle, toggleLabel, toggle } = usePreviewList(
  repos,
  5,
)
</script>

<template>
  <section v-if="repoCount" class="rounded-2 border border-ui-border-subtle/40">
    <h3>
      <button
        class="group w-full flex items-center gap-2 px-6 py-3.5 text-left"
        :aria-expanded="isExpanded"
        aria-controls="repo-activity-panel"
        @click="isExpanded = !isExpanded"
      >
        <span
          class="i-lucide:folder-git-2 text-sm text-ui-muted shrink-0"
          aria-hidden="true"
        />
        <span
          class="font-mono text-sm text-ui-text/90 transition-colors group-hover:text-ui-text"
        >
          All activity by repository
        </span>
        <span class="text-ui-muted text-sm">
          {{ repoCount }} {{ repoCount === 1 ? 'repo' : 'repos' }}
        </span>
        <span
          class="i-lucide:chevron-down ml-auto text-sm text-ui-muted/50 group-hover:text-ui-text transition-all shrink-0"
          :class="isExpanded && 'rotate-180'"
        />
      </button>
    </h3>

    <div v-if="isExpanded" id="repo-activity-panel" class="px-6 pb-5">
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
        />
      </ul>

      <button
        v-if="canToggle"
        class="mt-2 text-ui-muted text-xs hover:text-ui-text transition-colors"
        @click="toggle"
      >
        {{ toggleLabel }}
      </button>
    </div>
  </section>
</template>
