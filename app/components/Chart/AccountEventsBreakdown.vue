<script setup lang="ts">
import type { GitHubEvent, IdentityClassification } from '@unveil/identity'
import {
  VueUiHorizontalBar,
  type VueUiHorizontalBarDatasetItem,
  type VueUiHorizontalBarConfig,
} from 'vue-data-ui/vue-ui-horizontal-bar'
import type { EventTaxonomyKey } from '~~/shared/utils/event-taxonomy'

import('vue-data-ui/style.css')

const props = defineProps<{
  events: GitHubEvent[]
  classification?: IdentityClassification
}>()

const rootEl = shallowRef<HTMLElement | null>(null)

onMounted(async () => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)
const { taxonomy } = useEventsTaxonomy(colors, props.classification)

function isEventTaxonomyKey(value: unknown): value is EventTaxonomyKey {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(taxonomy.value, value)
  )
}

function createDataset(events: GitHubEvent[]): VueUiHorizontalBarDatasetItem[] {
  const totals = events.reduce<Record<string, number>>((accumulator, event) => {
    if (typeof event.type !== 'string') {
      return accumulator
    }

    accumulator[event.type] = (accumulator[event.type] ?? 0) + 1

    return accumulator
  }, {})

  return Object.entries(totals).map(([eventType, total]) => {
    const taxonomyEntry = isEventTaxonomyKey(eventType)
      ? taxonomy.value[eventType]
      : undefined

    const color =
      taxonomyEntry && 'color' in taxonomyEntry
        ? (taxonomyEntry.color ?? colors.value.cardLight)
        : colors.value.cardLight

    return {
      name: taxonomyEntry?.name ?? eventType,
      value: total,
      color,
    }
  })
}

const dataset = computed<VueUiHorizontalBarDatasetItem[]>(() =>
  createDataset(props.events),
)

const config = computed<VueUiHorizontalBarConfig>(() => ({
  userOptions: { show: false },
  style: {
    chart: {
      backgroundColor: colors.value.bg,
      legend: { show: false },
      height: Math.max(70, (dataset.value.length + 1) * 16),
      layout: {
        bars: {
          gap: 6,
          useGradient: false,
          borderRadius: 1,
          underlayerColor: colors.value.bg,
          dataLabels: {
            color: colors.value.textMuted,
            fontSize: 9,
          },
          nameLabels: {
            color: colors.value.textMuted,
            fontSize: 9,
          },
        },
        highlighter: {
          opacity: 0,
          color: colors.value.text,
        },
      },
      tooltip: { show: false },
    },
  },
}))

const isExpanded = shallowRef(false)
const { trackEvent } = useSaEvent()
function toggleExpanded() {
  isExpanded.value = !isExpanded.value

  if (isExpanded.value) {
    trackEvent('account_events_breakdown_opened')
  } else {
    trackEvent('account_events_breakdown_closed')
  }
}
</script>

<template>
  <div v-if="events.length">
    <button
      class="mx-auto flex w-fit flex-wrap items-center gap-2 mb-1 text-left text-sm text-gh-muted"
      @click="toggleExpanded"
    >
      <span>Events breakdown</span>
      <span
        class="i-lucide:chevron-down ml-auto mt-0.5 shrink-0 text-sm text-gh-muted transition-transform"
        :class="isExpanded && 'rotate-180'"
      />
    </button>

    <div v-if="isExpanded">
      <ClientOnly>
        <VueUiHorizontalBar :dataset :config />
      </ClientOnly>
    </div>
  </div>
</template>
