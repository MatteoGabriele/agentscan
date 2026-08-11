<script setup lang="ts">
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
  type VueUiXyDatasetLineItem,
} from 'vue-data-ui/vue-ui-xy'
import { useTooltipPosition } from 'vue-data-ui/composables'
import { useElementSize } from '@vueuse/core'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { round } from '~~/shared/utils/numbers'

dayjs.extend(utc)

import('vue-data-ui/style.css')

const { data: hourlyWindow } = await useEcosystemHealthHourlyWindow()

const automationThreshold = 50
const mixedThreshold = 50

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)
const isMobile = useIsMobile()

const scanTimes = computed(() =>
  hourlyWindow.value?.scanTimes.slice(isMobile.value ? -12 : 0),
)
const countsByScanTime = computed(() => hourlyWindow.value?.countsByScanTime)

const chartRef = useTemplateRef('chartRef')
const tooltipPosition = useTooltipPosition(chartRef)

const chartContainer = useTemplateRef<HTMLElement>('chartContainer')
const { width, height } = useElementSize(chartContainer)

const hasStableChartDimensions = computed(
  () => width.value > 0 && height.value > 0,
)

type HourlySerie = VueUiXyDatasetItem & {
  category: EcosystemHealthCategory
  trends: number[]
  counts: number[]
  totals: number[]
}

const SERIES: Array<{ name: string; category: EcosystemHealthCategory }> = [
  { name: 'Organic', category: 'organic' },
  { name: 'Mixed', category: 'mixed' },
  { name: 'Automation', category: 'automation' },
]

function getSerieColor(category: EcosystemHealthCategory) {
  if (category === 'organic') {
    return colors.value.greenLine
  }
  if (category === 'mixed') {
    return colors.value.amber
  }
  return colors.value.dangerHover
}

const rawDataset = computed<HourlySerie[]>(() =>
  SERIES.map(({ name, category }) => ({
    name,
    category,
    series: (scanTimes.value ?? []).map(
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
    color: getSerieColor(category),
    type: 'line',
    smooth: true,
    useArea: true,
  })),
)

const scaleMax = computed(() => {
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
      bottom: 36,
    },
    highlighter: {
      opacity: 1,
      color: colors.value.text,
      useLine: true,
    },
    tooltip: {
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

function getTrend({
  serieIndex,
  index,
}: {
  serieIndex: number
  index: number
}) {
  const serie = rawDataset.value[serieIndex]
  const trend = serie?.trends[index]

  return {
    formattedValue: formatTrend(trend),
    color: getTrendColor({ value: trend, reversed: serie?.name !== 'Organic' }),
    arrow: getTrendArrow(trend),
  }
}

function formatScanTime(index: number) {
  const scanTime = scanTimes.value?.[index]

  if (!scanTime) {
    return ''
  }

  return dayjs(scanTime).format('ddd, MMM D • HH:mm')
}

function getScanDetails({
  serieIndex,
  index,
}: {
  serieIndex: number
  index: number
}) {
  const serie = rawDataset.value[serieIndex]
  const count = serie?.counts[index]
  const total = serie?.totals[index]

  if (count === undefined || !total) {
    return ''
  }

  return `${count} / ${total}`
}

type Datapoints = Array<VueUiXyDatasetLineItem & { alerts: boolean[] }>

type PlotAlert = {
  name: string
  coordinates: Array<{
    x: number
    y: number
    absoluteIndex: number
    isAlertAutomation: boolean
    isAlertMixed: boolean
  }>
}

function isAlert(value: VueUiXyDatasetItem['series'][0], threshold: number) {
  return value != null && (value as number) > threshold
}

type Coordinates = { x: number; y: number }

function getZapIconPath({ x, y }: Coordinates) {
  // ⚡ with relative coordinates from initial position
  return `M ${x} ${y} l 12 -17 l -6 0 l 3 -13 l -11 17 l 6 0 l -4 13`
}

function getWarningIconPath({ x, y }: Coordinates) {
  // ⚠ with relative coordinates from initial position
  return `m${x} ${y}l 0 5 m 0 -12 l -9 16 l 18 0 l -9 -16`
}

function alertIcons(data: Datapoints, zoomOffset = 0): PlotAlert[] {
  return data.map((d) => {
    return {
      name: d.name,
      coordinates: (d.plots || []).map((plot, index) => {
        const absoluteIndex = index + zoomOffset

        return {
          ...plot,
          absoluteIndex,
          isAlertAutomation:
            d.name === 'Automation' &&
            isAlert(d.absoluteValues[absoluteIndex]!, automationThreshold),
          isAlertMixed:
            d.name === 'Mixed' &&
            isAlert(d.absoluteValues[absoluteIndex]!, mixedThreshold),
        }
      }),
    }
  })
}
const progressionLabelOffsetX = 0

const viewBoxPadding = computed(() => {
  const maxSeries = scanTimes.value?.length ?? 0

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
</script>

<template>
  <div class="relative h-full w-full flex flex-col">
    <div
      ref="chartContainer"
      class="flex-1 h-full no-chart-transition"
      @mouseenter="isChartHovered = true"
      @mouseleave="isChartHovered = false"
    >
      <ClientOnly>
        <Transition name="chart-fade" appear>
          <VueUiXy
            v-if="hasStableChartDimensions"
            ref="chartRef"
            :dataset
            :config
          >
            <template #svg="{ svg }">
              <g
                v-for="alerts in alertIcons(
                  svg.data as Datapoints,
                  svg.slicer.start,
                )"
                :key="alerts.name"
              >
                <template
                  v-for="plot in alerts.coordinates"
                  :key="`${alerts.name}-${plot.absoluteIndex}`"
                >
                  <path
                    v-show="plot.isAlertAutomation"
                    class="zap-icon"
                    :d="
                      getZapIconPath({
                        x: plot.x - 4,
                        y: plot.y - 6,
                      })
                    "
                    :fill="colors.red"
                    :stroke="colors.bg"
                  />
                  <path
                    v-show="plot.isAlertMixed"
                    class="zap-icon"
                    :d="
                      getWarningIconPath({
                        x: plot.x,
                        y: plot.y - 20,
                      })
                    "
                    :fill="colors.amber"
                    :stroke="colors.bg"
                    stroke-linecap="round"
                    stroke-width="1.5"
                  />
                </template>
              </g>
            </template>

            <template #area-gradient="{ series, id }">
              <linearGradient :id x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  :stop-color="series.color"
                  stop-opacity="0.3"
                />
                <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
              </linearGradient>
            </template>

            <template #tooltip="{ datapoint, timeLabel }">
              <div class="flex flex-col">
                <div :style="{ color: colors.textMuted }" class="mb-1">
                  {{ formatScanTime(timeLabel.absoluteIndex) }}
                </div>
                <div
                  v-for="dp in datapoint"
                  :key="`${dp.name}-${dp.absoluteIndex}`"
                  class="flex flex-row gap-2 place-items-center"
                >
                  <div class="h-2 w-2 shrink-0">
                    <svg viewBox="0 0 2 2" class="w-full h-full">
                      <circle cx="1" cy="1" r="1" :fill="dp.color" />
                    </svg>
                  </div>
                  <span :style="{ color: colors.text }">{{ dp.name }}</span>
                  <span
                    :style="{ color: colors.textMuted }"
                    class="tabular-nums"
                  >
                    {{ round(dp.value ?? 0, 1) + '%' }}
                  </span>
                  <span
                    :style="{ color: colors.textMuted }"
                    class="tabular-nums"
                  >
                    {{
                      getScanDetails({
                        serieIndex: dp.slotAbsoluteIndex,
                        index: timeLabel.absoluteIndex,
                      })
                    }}
                  </span>

                  <!-- No trend is possible on the first datapoint -->
                  <span
                    v-if="timeLabel.absoluteIndex > 0"
                    :class="[
                      getTrend({
                        serieIndex: dp.slotAbsoluteIndex,
                        index: timeLabel.absoluteIndex,
                      }).color,
                    ]"
                  >
                    <span
                      :class="[
                        getTrend({
                          serieIndex: dp.slotAbsoluteIndex,
                          index: timeLabel.absoluteIndex,
                        }).arrow,
                      ]"
                      class="shrink-0"
                      style="vertical-align: middle"
                    />
                    {{
                      getTrend({
                        serieIndex: dp.slotAbsoluteIndex,
                        index: timeLabel.absoluteIndex,
                      }).formattedValue
                    }}
                  </span>
                </div>
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
                  absoluteIndex % (isMobile ? 3 : 6) === 0 &&
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

.no-chart-transition path,
.no-chart-transition circle {
  transition: none !important;
  animation: none !important;
}

.time-label {
  transition: all 250ms ease !important;
}
</style>
