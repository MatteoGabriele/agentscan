<script setup lang="ts">
import { useTooltipPosition } from 'vue-data-ui/composables'
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
} from 'vue-data-ui/vue-ui-xy'
import type { RepoReportDay } from '~~/shared/types/repo-report'
import { classifyByScore } from '~~/shared/utils/activity-stats'

import 'vue-data-ui/style.css'

const props = defineProps<{
  days: RepoReportDay[]
}>()

const CHART_WIDTH = 1000
const CHART_HEIGHT = 280
const Y_AXIS_TICKS = [50, 70]
const Y_AXIS_FONT_SIZE = 16
const Y_AXIS_CROSSHAIR_SIZE = 6
const CLASSIFICATION_SEGMENTS = [
  {
    classification: 'organic',
    start: 0,
    end: 0.2,
    startOffset: 14,
    endOffset: 6,
  },
  {
    classification: 'mixed',
    start: 0.2,
    end: 0.4,
    startOffset: 36,
    endOffset: 8,
  },
  {
    classification: 'automation',
    start: 0.4,
    end: 1,
    startOffset: 36,
    endOffset: -14,
  },
] as const

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
const scoreColors = computed(() =>
  props.days.map((day) => {
    const classification =
      day.score === null ? null : classifyByScore(Math.round(day.score))

    return classification === null || classification === 'insufficient-data'
      ? colors.value.textMuted
      : colors.value[classification]
  }),
)

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
    nullDashes: {
      show: true,
    },
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
    width: CHART_WIDTH,
    height: CHART_HEIGHT,
    padding: { right: 0 },
    grid: {
      position: 'start',
      stroke: 'transparent',
      labels: {
        color: colors.value.textMuted,
        fontSize: Y_AXIS_FONT_SIZE,
        yAxis: {
          crosshairSize: Y_AXIS_CROSSHAIR_SIZE,
          scaleMin: 0,
          scaleMax: 100,
          commonScaleSteps: 2,
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
  <div
    ref="chartRef"
    class="relative w-full"
    :style="{ aspectRatio: `${CHART_WIDTH} / ${CHART_HEIGHT}` }"
  >
    <ClientOnly>
      <Transition name="repo-score-fade" appear>
        <VueUiXy :dataset :config>
          <template #svg="{ svg }">
            <g
              v-for="tick in Y_AXIS_TICKS"
              :key="tick"
              :transform="`translate(0, ${svg.drawingArea.bottom - (tick / 100) * svg.drawingArea.height})`"
              pointer-events="none"
            >
              <line
                :x1="svg.drawingArea.left"
                :x2="svg.drawingArea.right"
                y1="0"
                y2="0"
                :stroke="colors.border"
                stroke-dasharray="4 6"
                stroke-width="1"
              />
              <text
                :x="svg.drawingArea.scaleLabelX - Y_AXIS_CROSSHAIR_SIZE"
                :y="Y_AXIS_FONT_SIZE / 3"
                :fill="colors.textMuted"
                :font-size="Y_AXIS_FONT_SIZE"
                text-anchor="end"
              >
                {{ tick }}
              </text>
            </g>

            <line
              v-for="segment in CLASSIFICATION_SEGMENTS"
              :key="segment.classification"
              :x1="svg.drawingArea.left - 22"
              :x2="svg.drawingArea.left - 22"
              :y1="
                svg.drawingArea.top +
                svg.drawingArea.height * segment.start +
                segment.startOffset
              "
              :y2="
                svg.drawingArea.top +
                svg.drawingArea.height * segment.end +
                segment.endOffset
              "
              :stroke="colors[segment.classification]"
              stroke-linecap="round"
            />

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
              <p class="flex items-center gap-1">
                <span
                  aria-hidden="true"
                  class="h-2 w-2 shrink-0 rounded-full"
                  :style="{
                    backgroundColor: scoreColors[timeLabel.absoluteIndex],
                  }"
                />
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
      </Transition>
      <template #fallback>
        <Skeleton
          class="absolute inset-0"
          height="h-full"
          role="status"
          aria-label="Loading daily score chart"
        />
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.repo-score-fade-enter-active {
  transition: opacity 300ms ease;
}

.repo-score-fade-enter-from {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .repo-score-fade-enter-active {
    transition: none;
  }
}
</style>
