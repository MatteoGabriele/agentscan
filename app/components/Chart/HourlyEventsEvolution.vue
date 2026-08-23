<script setup lang="ts">
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
  type VueUiXyEmitSelectX,
} from 'vue-data-ui/vue-ui-xy'
import { useTooltipPosition } from 'vue-data-ui/composables'
import { useElementSize, useTimeout } from '@vueuse/core'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { round } from '~~/shared/utils/numbers'
import type {
  EventsEvolutionSeries,
  VueUiXySeriesWithCounts,
} from '~~/shared/types/ecosystem-health.ts'
import {
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY,
  getTotalPrScanned,
} from '~~/shared/utils/charts.ts'

dayjs.extend(utc)

import('vue-data-ui/style.css')

const { data: hourlyWindow, status } = useEcosystemHealthHourlyWindow()

const ready = shallowRef(false)

useTimeout(200, {
  callback: () => (ready.value = true),
})

const isLoading = computed(() => status.value !== 'success')

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)
const isMobile = useIsMobile()

const MOBILE_SLICE_HOURS = 13

const scanTimes = computed(() =>
  hourlyWindow.value?.scanTimes.slice(isMobile.value ? -MOBILE_SLICE_HOURS : 0),
)
const countsByScanTime = computed(() => hourlyWindow.value?.countsByScanTime)

const scanTimesOffset = computed(() => {
  if (!isMobile.value) {
    return 0
  }
  const total = hourlyWindow.value?.scanTimes.length ?? 0
  return Math.max(0, total - MOBILE_SLICE_HOURS)
})

const chartRef = useTemplateRef('chartRef')
const tooltipPosition = useTooltipPosition(chartRef)

const chartContainer = useTemplateRef<HTMLElement>('chartContainer')
const { width, height } = useElementSize(chartContainer)

const hasStableChartDimensions = computed(
  () => width.value > 0 && height.value > 0,
)

const skeletonSeries = computed<number[]>(() => {
  const length = isMobile.value ? 13 : 25
  return Array.from({ length }, () => 50)
})

const rawDataset = computed<EventsEvolutionSeries[]>(() =>
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY.map(({ name, category }) => ({
    name,
    category,
    series: isLoading.value
      ? skeletonSeries.value
      : (scanTimes.value ?? []).map(
          (scanTime) =>
            countsByScanTime.value?.[scanTime]?.[category].percentage ?? 0,
        ),
    trends: (scanTimes.value ?? []).map(
      (scanTime) => countsByScanTime.value?.[scanTime]?.[category].trend ?? 0,
    ),
    counts: (scanTimes.value ?? []).map(
      (scanTime) => countsByScanTime.value?.[scanTime]?.[category].count ?? 0,
    ),
    totals: (scanTimes.value ?? []).map(
      (scanTime) => countsByScanTime.value?.[scanTime]?.total.count ?? 0,
    ),
    color: isLoading.value ? colors.value.border : colors.value[category],
    type: 'line',
    smooth: true,
    useArea: true,
  })),
)

const scaleMax = computed(() => {
  if (isLoading.value) {
    return 100
  }
  const values = rawDataset.value.flatMap((serie) =>
    (serie.series as Array<number | null>).map((point) => point ?? 0),
  )
  const max = values.length ? Math.max(...values) : 0

  return Math.min(100, Math.max(10, Math.ceil(max / 10) * 10))
})

const dataset = computed<VueUiXyDatasetItem[]>(() =>
  rawDataset.value.map((serie) => ({
    ...serie,
    scaleMin: 0,
    scaleMax: scaleMax.value,
  })),
)

const hasSingleEntry = computed(() => dataset.value[0]?.series.length === 1)

const axisTimeFormat = 'HH:mm'

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  transitions: {
    enable: ready.value,
    pauseOnDatasetChange: false,
  },
  chart: {
    userOptions: { show: false },
    zoom: { show: false },
    legend: { show: false },
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    width: Math.round(width.value),
    height: Math.round(height.value),
    padding: {
      left: viewBoxPadding.value.left,
      right: viewBoxPadding.value.right,
      /**
       * Extra padding bottom is added on desktop to compensate the illusion of height difference between the daily and hourly charts, and avoid a CLS impression when switching between them; but not on mobile, where we need all the real estate we can use.
       */
      bottom: isMobile.value ? 0 : 36,
    },
    highlighter: {
      opacity: isLoading.value ? 0 : 1,
      color: colors.value.text,
      useLine: !isLoading.value,
    },
    tooltip: {
      show: !isLoading.value,
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 30,
      position: tooltipPosition.value,
      offsetX: 24,
      offsetY: -64,
    },
    grid: {
      stroke: 'transparent',
      labels: {
        show: false,
        fontSize: 12,
        color: colors.value.textMuted,
        yAxis: {
          useIndividualScale: false,
          scaleMin: 0,
          scaleMax: scaleMax.value,
          formatter: ({ value }) => `${round(Number(value), 0)}%`,
        },
        xAxisLabels: {
          show: true,
          color: colors.value.textMuted,
          fontSize: isMobile.value ? 10 : 12,
          values: scanTimes.value,
          datetimeFormatter: {
            enable: true,
            useUTC: false,
            locale: 'en',
            options: {
              year: axisTimeFormat,
              month: axisTimeFormat,
              day: axisTimeFormat,
              hour: axisTimeFormat,
              minute: axisTimeFormat,
              second: axisTimeFormat,
            },
          },
        },
      },
    },
  },
  line: {
    radius: hasSingleEntry.value ? 4 : 0,
    useGradient: false,
    strokeWidth: isMobile.value ? 1 : 2,
    dot: {
      useSerieColor: true,
      fill: colors.value.bg,
      strokeWidth: 2,
    },
  },
}))

function formatScanTime(index: number) {
  const scanTime = scanTimes.value?.[index]

  if (!scanTime) {
    return ''
  }

  return dayjs(scanTime).format('ddd, MMM D • HH:mm')
}

const progressionLabelOffsetX = 0

const viewBoxPadding = computed(() => {
  const maxSeries = isLoading.value ? 25 : (scanTimes.value?.length ?? 0)

  if (maxSeries <= 1 || width.value <= 0) {
    return { left: 0, right: 0 }
  }

  const halfVueUiXyDatapointStep = width.value / (2 * (maxSeries - 1))

  return {
    left: -halfVueUiXyDatapointStep,
    right: -halfVueUiXyDatapointStep - progressionLabelOffsetX,
  }
})

const isChartHovered = shallowRef(false)

/**
 * Boilerplate for tooltip content switching
 */

function handleDatapointClick(_payload: VueUiXyEmitSelectX) {
  if (isMobile.value) {
    return // We don't drill down repo details on mobile
  }
  // TODO: uncomment when we're ready to use this feature
  // toggleTooltipView()
}

const showTooltipRepoBreakdown = shallowRef(false)

function resetTooltip() {
  showTooltipRepoBreakdown.value = false
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toggleTooltipView() {
  showTooltipRepoBreakdown.value = !showTooltipRepoBreakdown.value
}

function handleChartMouseleave() {
  isChartHovered.value = false
  resetTooltip()
}
</script>

<template>
  <div class="relative h-full w-full flex flex-col" :class="{ ready: ready }">
    <div
      ref="chartContainer"
      class="flex-1 h-full no-chart-transition"
      @mouseenter="isChartHovered = true"
      @mouseleave="handleChartMouseleave"
    >
      <ClientOnly>
        <Transition name="chart-fade" appear>
          <VueUiXy
            v-if="hasStableChartDimensions"
            ref="chartRef"
            :dataset
            :config
            @select-x="handleDatapointClick"
          >
            <template #area-gradient="{ series, id }">
              <linearGradient :id x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  :stop-color="series.color"
                  :stop-opacity="isLoading ? 0.05 : 0.3"
                />
                <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
              </linearGradient>
            </template>

            <template #svg="{ svg }">
              <text
                v-if="isLoading"
                :x="svg.drawingArea.left + svg.drawingArea.width / 2"
                :y="svg.drawingArea.top + svg.drawingArea.height / 4"
                :fill="colors.textMuted"
                :font-size="14"
                :stroke="colors.bg"
                :stroke-width="6"
                paint-order="stroke fill"
                stroke-linejoin="round"
                stroke-linecap="round"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                Loading...
              </text>
              <path
                v-if="isLoading"
                class="animated-path"
                :d="`
                    M ${svg.drawingArea.left} ${svg.drawingArea.top + svg.drawingArea.height / 2}
                    L ${svg.drawingArea.left + svg.drawingArea.width} ${svg.drawingArea.top + svg.drawingArea.height / 2}
                  `"
                :style="{
                  strokeDasharray: svg.drawingArea.width,
                  strokeDashoffset: svg.drawingArea.width,
                }"
                stroke="white"
                stroke-width="2"
                fill="none"
              />
            </template>

            <template
              #tooltip="{ datapoint, timeLabel, series, absoluteIndex }"
            >
              <div class="flex flex-col tabular-nums">
                <ChartEventsEvolutionTooltipHeader
                  :time-label="formatScanTime(timeLabel.absoluteIndex)"
                  :count="
                    getTotalPrScanned(
                      series as VueUiXySeriesWithCounts,
                      absoluteIndex,
                    )
                  "
                />

                <!-- TODO: dedicated tooltip component for the repo drill view -->
                <!-- NOTE: it should have an equivalent width as the regular tooltip to avoid a big shift when toggling, because the tooltip will keep the same coordinates when its content changes -->
                <div
                  v-if="showTooltipRepoBreakdown"
                  class="max-w-[300px] text-xs"
                >
                  <!-- Additional content added to the dataset computed property will be surfaced in the exposed datapoint -->
                  {{ datapoint }}
                </div>

                <ChartEventsEvolutionTooltipTable
                  v-else
                  :tooltip-slot-props="{ datapoint, timeLabel, series }"
                  :colors
                  :can-compare="timeLabel.absoluteIndex > 0"
                  :raw-dataset="rawDataset"
                >
                  <template #thead>
                    <th class="px-2 text-center">vs Hour-1</th>
                    <th class="px-2 text-left">Trend</th>
                  </template>
                </ChartEventsEvolutionTooltipTable>
              </div>
            </template>

            <template
              #time-label="{
                x,
                y,
                content,
                fontSize,
                fill,
                textAnchor,
                absoluteIndex,
              }"
            >
              <text
                v-if="
                  !isLoading &&
                  (absoluteIndex + scanTimesOffset) % (isMobile ? 3 : 6) ===
                    0 &&
                  ![0, (scanTimes?.length ?? 1) - 1].includes(absoluteIndex)
                "
                :x="x"
                :y="y + fontSize * 2"
                :font-size="fontSize"
                :fill
                :text-anchor="textAnchor"
                :opacity="isChartHovered || isMobile ? 1 : 0"
                class="time-label"
              >
                {{ content }}
              </text>
            </template>
          </VueUiXy>
        </Transition>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
:deep(.vue-data-ui-component path),
:deep(.vue-data-ui-component circle) {
  transition: none !important;
}
.ready :deep(.vue-data-ui-component path) {
  transition: all 0.2s !important;
}
:deep(.vue-ui-xy-svg) {
  overflow: visible; /** for last time label cropping issue  */
}

.chart-fade-enter-active {
  transition: opacity 300ms ease;
}

.chart-fade-enter-from {
  opacity: 0;
}

.chart-fade-enter-to {
  opacity: 1;
}

.time-label {
  transition: all 250ms ease !important;
}
</style>
