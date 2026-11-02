<script setup lang="ts">
import { useTooltipPosition } from 'vue-data-ui/composables'
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
} from 'vue-data-ui/vue-ui-xy'
import type { RepoReportDay } from '~~/shared/types/repo-report'

import('vue-data-ui/style.css')

const props = defineProps<{
  days: RepoReportDay[]
}>()

const rootEl = shallowRef<HTMLElement | null>(null)
const chartRef = useTemplateRef('chartRef')

onMounted(() => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)
const isMobile = useIsMobile()
const tooltipPosition = useTooltipPosition(chartRef)

const hoveredIndex = ref<number | null>(null)

const timeLabels = computed(() =>
  props.days.map((day) => new Date(day.date).getTime()),
)

const counts = computed(() => props.days.map((day) => day.count))

const dataset = computed<VueUiXyDatasetItem[]>(() => [
  {
    name: 'Score',
    type: 'line',
    smooth: true,
    series: props.days.map((day) =>
      day.score === null ? null : Math.round(day.score),
    ),
    color: colors.value.text,
    scaleMin: 0,
    scaleMax: 100,
  },
])

const XAXIS_LABELS_MOD_THRESHOLD = 8
const TIME_LABEL_FORMAT = 'MMM dd'

const config = computed<VueUiXyConfig>(() => ({
  events: {
    datapointEnter: ({ seriesIndex }) => {
      hoveredIndex.value = seriesIndex
    },
    datapointLeave: () => (hoveredIndex.value = null),
  },
  useCssAnimation: false,
  line: {
    strokeWidth: isMobile.value ? 1.5 : 2,
    radius: 0,
    useGradient: false,
    dot: {
      useSerieColor: true,
      fill: colors.value.bg,
      strokeWidth: 2,
    },
  },
  chart: {
    userOptions: { show: false },
    legend: { show: false },
    zoom: { show: false },
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    height: 280,
    padding: { right: 0 },
    grid: {
      position: 'start',
      stroke: 'transparent',
      labels: {
        color: colors.value.textMuted,
        yAxis: {
          scaleMin: 0,
          scaleMax: 100,
          commonScaleSteps: 5,
        },
        xAxisLabels: {
          values: timeLabels.value,
          color: colors.value.textMuted,
          showOnlyAtModulo:
            timeLabels.value.length > XAXIS_LABELS_MOD_THRESHOLD,
          modulo: Math.max(
            1,
            Math.round(timeLabels.value.length / XAXIS_LABELS_MOD_THRESHOLD),
          ),
          autoRotate: { enable: false },
          datetimeFormatter: {
            enable: true,
            useUTC: true,
            options: {
              year: TIME_LABEL_FORMAT,
              month: TIME_LABEL_FORMAT,
              day: TIME_LABEL_FORMAT,
              hour: TIME_LABEL_FORMAT,
              minute: TIME_LABEL_FORMAT,
              second: TIME_LABEL_FORMAT,
            },
          },
        },
      },
    },
    highlighter: {
      opacity: 0,
      color: colors.value.textMuted,
      useLine: true,
    },
    tooltip: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 30,
      position: tooltipPosition.value,
      offsetX: 24,
      offsetY: -32,
    },
  },
}))

function formatDay(index: number) {
  const day = props.days[index]

  if (!day) {
    return ''
  }

  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(day.date))
}
</script>

<template>
  <div ref="chartRef">
    <ClientOnly>
      <VueUiXy :dataset :config>
        <template #svg="{ svg }">
          <ChartPrVolumeLine
            :svg
            :counts
            :color="colors.textMuted"
            :background-color="colors.bg"
            visible
            :stroke-width="isMobile ? 1.5 : 2"
            :hovered-index="hoveredIndex"
          />
        </template>

        <template #tooltip="{ datapoint, timeLabel }">
          <div class="flex flex-col gap-1 tabular-nums text-sm">
            <ChartEventsEvolutionTooltipHeader
              :time-label="formatDay(timeLabel.absoluteIndex)"
            />
            <p>
              Score
              <span class="font-semibold">{{
                datapoint[0]?.value ?? '–'
              }}</span>
            </p>
            <p class="text-ui-muted">
              {{ counts[timeLabel.absoluteIndex] ?? 0 }} PRs scored
            </p>
          </div>
        </template>
      </VueUiXy>
    </ClientOnly>
  </div>
</template>
