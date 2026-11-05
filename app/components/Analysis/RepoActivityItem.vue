<script setup lang="ts">
import type { RepoActivity } from '~/utils/repo-activity'

const props = defineProps<{
  activity: RepoActivity
}>()

const isExpanded = ref(false)

const summary = computed<string>(() => summarizeEvents(props.activity.events))
const repoUrl = computed<string>(
  () => `https://github.com/${props.activity.repo}`,
)

const { visibleItems, canToggle, toggleLabel, toggle } = usePreviewList(
  () => props.activity.events,
  5,
)
</script>

<template>
  <li class="not-last:border-b border-ui-border-subtle/15">
    <button
      class="group w-[calc(100%+1rem)] -mx-2 px-2 flex items-start gap-3 text-left py-3.5 rounded-md transition-colors hover:bg-ui-muted/6"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <div class="min-w-0 flex-1">
        <span
          class="block truncate font-mono text-sm text-ui-text/90 transition-colors group-hover:text-ui-text"
        >
          {{ activity.repo }}
        </span>
        <p class="text-ui-muted text-sm text-pretty mt-0.5">{{ summary }}</p>
      </div>
      <span
        class="i-lucide:chevron-down text-sm text-ui-muted/50 group-hover:text-ui-text transition-all mt-0.5 shrink-0"
        :class="isExpanded && 'rotate-180'"
      />
    </button>

    <div
      v-if="isExpanded"
      class="pl-4 pb-4 border-l border-ui-border-subtle/20 space-y-3"
    >
      <ul
        class="rounded-lg border border-ui-border-subtle/30 divide-y divide-ui-border-subtle/15"
      >
        <AnalysisEventItem
          v-for="(event, i) in visibleItems"
          :key="`${event.created_at}-${i}`"
          :event
          :show-repo="false"
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
