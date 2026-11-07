<script setup lang="ts">
import type { GitHubEvent } from '@unveil/identity/providers/github'
import type { RepoActivity } from '~/utils/repo-activity'

const props = defineProps<{
  activity: RepoActivity
  /** Set when AgentScan tracks this repository. */
  activityPath?: string
}>()

const isExpanded = ref(false)

const summary = computed<string>(() => summarizeEvents(props.activity.events))
const repoUrl = computed<string>(
  () => `https://github.com/${props.activity.repo}`,
)

// Event rows render the raw GitHub event each one was normalized from.
const sourceEvents = computed<GitHubEvent[]>(() => {
  return props.activity.events.flatMap((event) => event.source ?? [])
})

const { visibleItems, canToggle, toggleLabel, toggle } = usePreviewList(
  sourceEvents,
  5,
)
</script>

<template>
  <li class="not-last:border-b border-ui-border/25">
    <div class="flex items-start gap-3">
      <button
        class="group flex-1 min-w-0 py-4 flex items-start gap-2 text-left"
        :aria-expanded="isExpanded"
        @click="isExpanded = !isExpanded"
      >
        <span
          class="i-lucide:chevron-right text-sm text-ui-muted/50 transition-all mt-0.5 shrink-0 group-hover:text-ui-text"
          :class="isExpanded ? 'rotate-90' : 'group-hover:translate-x-0.5'"
        />
        <div class="min-w-0 flex-1">
          <span
            class="block truncate font-mono text-sm text-ui-text/90 underline decoration-transparent underline-offset-4 transition-colors group-hover:text-ui-text group-hover:decoration-ui-border-subtle"
          >
            {{ activity.repo }}
          </span>
          <p
            class="text-ui-muted text-sm text-pretty mt-1 transition-colors group-hover:text-ui-text/75"
          >
            {{ summary }}
          </p>
        </div>
      </button>

      <NuxtLink
        v-if="activityPath"
        :to="activityPath"
        :aria-label="`${activity.repo} is tracked by AgentScan. View repository activity`"
        class="mt-4 shrink-0 inline-flex items-center gap-1 whitespace-nowrap rounded-full border-1 border-solid border-ui-border/50 px-2 py-0.5 text-xs text-ui-muted/80 transition-colors hover:border-ui-border hover:text-ui-text"
      >
        <span class="i-lucide:chart-line shrink-0" aria-hidden="true" />
        Tracked
      </NuxtLink>
    </div>

    <div
      v-if="isExpanded"
      class="ml-1.5 pl-4 mb-5 border-l border-ui-border/30 space-y-3"
    >
      <ul class="rounded-lg border border-ui-border/45">
        <AnalysisEventItem
          v-for="(event, i) in visibleItems"
          :key="`${event.created_at}-${i}`"
          :event
          :show-repo="false"
          class="not-last:border-b border-ui-border/25"
        />
      </ul>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <button
          v-if="canToggle"
          class="text-ui-muted text-xs hover:text-ui-text transition-colors"
          @click="toggle"
        >
          {{ toggleLabel }}
        </button>
        <NuxtLink
          :to="repoUrl"
          target="_blank"
          external
          class="ml-auto inline-flex items-center gap-1 text-xs text-ui-muted hover:text-ui-text transition-colors"
        >
          Open repository
          <span class="i-lucide:arrow-up-right shrink-0" />
        </NuxtLink>
      </div>
    </div>
  </li>
</template>
