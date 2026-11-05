<script setup lang="ts">
import type { GitHubEvent } from '@unveil/identity/providers/github'

const props = defineProps<{
  events: GitHubEvent[]
}>()

const { getEventIcon, formatEventTime, sortByTime } = useGitHubEventDisplay()

const PREVIEW_COUNT = 5

const showAll = ref(false)

const newestFirst = computed<GitHubEvent[]>(() => {
  return sortByTime(props.events).reverse()
})

const visibleEvents = computed<GitHubEvent[]>(() => {
  return showAll.value
    ? newestFirst.value
    : newestFirst.value.slice(0, PREVIEW_COUNT)
})

const hiddenCount = computed<number>(() => {
  return newestFirst.value.length - visibleEvents.value.length
})
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
      <li
        v-for="(event, i) in visibleEvents"
        :key="`${event.created_at}-${i}`"
        class="flex gap-2.5 px-3 py-2"
      >
        <span
          :class="getEventIcon(event)"
          class="text-xs text-ui-muted shrink-0 mt-1"
        />
        <div class="min-w-0 flex-1">
          <AnalysisFlagEvidenceLink :event />
          <p class="text-xs text-ui-muted">
            {{ formatEventTime(event.created_at) }} ·
            {{ event.repo?.name }}
          </p>
          <AnalysisFlagEvidenceTextLink :event />
        </div>
      </li>
    </ul>

    <button
      v-if="hiddenCount > 0 || showAll"
      class="mt-3 text-ui-muted text-xs hover:text-ui-text transition-colors"
      @click="showAll = !showAll"
    >
      {{ showAll ? 'Show less' : `Show ${hiddenCount} more` }}
    </button>
  </section>
</template>
