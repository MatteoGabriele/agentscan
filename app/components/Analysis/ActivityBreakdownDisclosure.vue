<script setup lang="ts">
import type { EventTypeSummary, RepoEvent } from '~/utils/repo-activity'

const props = defineProps<{
  events: RepoEvent[]
}>()

const PREVIEW_COUNT = 6

const isOpen = ref(false)

const types = computed<EventTypeSummary[]>(() =>
  summarizeEventTypes(props.events),
)

const subtitle = computed<string>(() => {
  return describeActivityBreakdown(types.value, getEventSpanDays(props.events))
})

// With a single type the subtitle already says everything.
const isExpandable = computed<boolean>(() => types.value.length > 1)

const showShare = computed<boolean>(() => {
  return props.events.length >= MIN_EVENTS_FOR_SHARE
})

const { visibleItems, canToggle, toggleLabel, toggle } = usePreviewList(
  types,
  PREVIEW_COUNT,
)

function repoDetail(repoCount: number): string {
  return repoCount === 1 ? 'in 1 repository' : `in ${repoCount} repositories`
}

function barWidth(share: number): string {
  return `${Math.max(share * 100, 1)}%`
}
</script>

<template>
  <div
    class="rounded-lg border-1 border-solid border-ui-border/50 transition-colors"
    :class="[
      isOpen && 'bg-ui-muted/5',
      !isOpen && isExpandable && 'hover:border-ui-border hover:bg-ui-muted/5',
    ]"
  >
    <CommonDisclosureRow
      v-model:open="isOpen"
      :expandable="isExpandable"
      summary-class="flex-1 min-w-0 items-center gap-3 px-4 py-3"
      chevron-class="text-ui-muted"
    >
      <template #summary>
        <span
          class="hidden sm:flex size-6 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <span class="i-lucide:chart-bar text-ui-muted" />
        </span>

        <span class="min-w-0 flex-1">
          <span class="block text-sm text-ui-text"> Activity breakdown </span>
          <span class="block truncate text-xs text-ui-muted">
            {{ subtitle }}
          </span>
        </span>
      </template>

      <div class="mx-4 mb-3 pt-3 border-t border-ui-border-subtle/40">
        <ul>
          <li
            v-for="item in visibleItems"
            :key="item.key"
            class="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 py-2"
          >
            <span class="min-w-0">
              <span
                class="block truncate text-sm text-ui-text/90 first-letter:uppercase"
              >
                {{ item.label }}
              </span>
              <span
                v-if="item.repoCount > 0"
                class="block truncate text-xs text-ui-muted"
              >
                {{ repoDetail(item.repoCount) }}
              </span>
            </span>
            <span class="whitespace-nowrap text-sm tabular-nums text-ui-text">
              {{ item.count }}
            </span>
            <span
              class="w-10 whitespace-nowrap text-right text-xs tabular-nums text-ui-muted"
            >
              {{ showShare ? formatEventShare(item.share) : '' }}
            </span>
            <span
              class="col-span-3 mt-1.5 block h-1 overflow-hidden rounded-full bg-ui-muted/10"
              aria-hidden="true"
            >
              <span
                class="block h-full rounded-full bg-ui-muted/50"
                :style="{ width: barWidth(item.share) }"
              />
            </span>
          </li>
        </ul>

        <button
          v-if="canToggle"
          class="mt-2 text-ui-muted text-xs hover:text-ui-text transition-colors"
          @click="toggle"
        >
          {{ toggleLabel }}
        </button>
      </div>
    </CommonDisclosureRow>
  </div>
</template>
