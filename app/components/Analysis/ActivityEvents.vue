<script setup lang="ts">
import type { GitHubEvent } from '@unveil/identity/providers/github'

const props = defineProps<{
  events: GitHubEvent[]
}>()

const { sortByTime } = useGitHubEventDisplay()

const newestFirst = computed<GitHubEvent[]>(() => {
  return sortByTime(props.events).reverse()
})

const { visibleItems, canToggle, toggleLabel, toggle } = usePreviewList(
  newestFirst,
  5,
)
</script>

<template>
  <section class="bg-ui-card rounded-2 px-6 py-5">
    <header class="flex items-baseline gap-2">
      <h3 class="text-ui-text text-lg font-mono">Analyzed events</h3>
      <span class="text-ui-muted text-sm">{{ events.length }}</span>
    </header>
    <p class="text-ui-muted text-sm text-pretty mt-0.5">
      Too few to classify, so here is everything the analysis looked at.
    </p>

    <ul
      class="mt-4 rounded-lg border border-ui-border-subtle/30 divide-y divide-ui-border-subtle/15"
    >
      <AnalysisEventItem
        v-for="(event, i) in visibleItems"
        :key="`${event.created_at}-${i}`"
        :event
      />
    </ul>

    <button
      v-if="canToggle"
      class="mt-3 text-ui-muted text-xs hover:text-ui-text transition-colors"
      @click="toggle"
    >
      {{ toggleLabel }}
    </button>
  </section>
</template>
