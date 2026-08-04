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
import { round } from '~~/shared/utils/numbers'

import('vue-data-ui/style.css')

const { data } = useEcosystemHealthHourly()

const scanTimes = computed(() => data.value?.scanTimes ?? [])
const countsByScanTime = computed(() => data.value?.countsByScanTime)
const hasData = computed(() => scanTimes.value.length > 0)

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)
const isMobile = useIsMobile()

const chartRef = useTemplateRef('chartRef')
const tooltipPosition = useTooltipPosition(chartRef)

// Sizing the chart from its container keeps labels at their real pixel size
// instead of letting the SVG scale them down on narrow screens.
const chartContainer = useTemplateRef<HTMLElement>('chartContainer')
const { width } = useElementSize(chartContainer)
const hasStableChartWidth = computed(() => width.value > 0)

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
    series: scanTimes.value.map(
      (scanTime) =>
        countsByScanTime.value?.[scanTime]?.[category].percentage ?? 0,
    ),
    trends: scanTimes.value.map(
      (scanTime) => countsByScanTime.value?.[scanTime]?.[category].trend ?? 0,
    ),
    counts: scanTimes.value.map(
      (scanTime) => countsByScanTime.value?.[scanTime]?.[category].count ?? 0,
    ),
    totals: scanTimes.value.map(
      (scanTime) => countsByScanTime.value?.[scanTime]?.total.count ?? 0,
    ),
    color: getSerieColor(category),
    type: 'line',
    smooth: true,
    useArea: true,
  })),
)

// Percentages rarely fill the whole 0-100 range, so the scale stops at the next
// round step above the highest value instead.
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

// Axis labels stay short — the tooltip carries the full timestamp.
const axisTimeFormat = 'HH:mm'

// A rolling day of scans is too many labels for one axis, so only every nth one
// is drawn.
const labelModulo = computed(() => {
  const maxLabels = isMobile.value ? 4 : 12
  return Math.max(1, Math.ceil(scanTimes.value.length / maxLabels))
})

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  chart: {
    userOptions: { show: false },
    zoom: { show: false },
    legend: { show: false, position: 'top' },
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    width: Math.round(width.value),
    height: 300,
    padding: {
      top: 0,
      right: 0,
      left: 0,
      bottom: 0,
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
      showVerticalLines: false,
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
          showOnlyAtModulo: labelModulo.value > 1,
          modulo: labelModulo.value,
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
    radius: 0,
    useGradient: false,
    strokeWidth: isMobile.value ? 1.5 : 2,
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
  const scanTime = scanTimes.value[index]

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
    isAlert: boolean
  }>
}

function isAlert(value: VueUiXyDatasetItem['series'][0], threshold: number) {
  return value != null && (value as number) > threshold
}

function getZapIconPath({ x, y }: { x: number; y: number }) {
  // ⚡ with relative coordinates from initial position
  return `M ${x} ${y} l 12 -17 l -6 0 l 3 -13 l -11 17 l 6 0 l -4 13`
}

function alertIcons(data: Datapoints, zoomOffset = 0): PlotAlert[] {
  return data.map((d) => {
    return {
      name: d.name,
      coordinates: d.plots!.map((plot, index) => {
        const absoluteIndex = index + zoomOffset

        return {
          ...plot,
          absoluteIndex,
          isAlert:
            d.name === 'Automation' &&
            isAlert(d.absoluteValues[absoluteIndex]!, 25),
        }
      }),
    }
  })
}

function log(n: any) {
  console.log(n)
}
</script>

<template>
  <section ref="rootEl">
    <div class="mb-5">
      <h2 class="text-center">Hourly ecosystem health</h2>
      <p class="text-sm text-gh-muted text-center text-pretty">
        Same classification split as the health page, but sampled every hour.
        Only the last 24 scans are kept, so this is a rolling one-day window.
      </p>
    </div>

    <p v-if="!hasData" class="text-sm text-gh-muted text-center py-12">
      No hourly scan has been recorded yet.
    </p>

    <ClientOnly v-else>
      <div ref="chartContainer" class="w-full">
        <VueUiXy v-if="hasStableChartWidth" ref="chartRef" :dataset :config>
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
                  v-show="plot.isAlert"
                  class="zap-icon"
                  :d="
                    getZapIconPath({
                      x: plot.x - 4,
                      y: plot.y - 6,
                    })
                  "
                  :fill="colors.amber"
                  :stroke="colors.bg"
                />
              </template>
            </g>
          </template>

          <template #area-gradient="{ series, id }">
            <linearGradient :id x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" :stop-color="series.color" stop-opacity="0.3" />
              <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
            </linearGradient>
          </template>

          <template #tooltip="{ datapoint, timeLabel }">
            <div class="flex flex-col text-xs">
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
                <span :style="{ color: colors.textMuted }" class="tabular-nums">
                  {{ round(dp.value ?? 0, 1) + '%' }}
                </span>
                <span :style="{ color: colors.textMuted }" class="tabular-nums">
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

          <template #legend="{ legend }">
            <div class="flex flex-row flex-wrap gap-4 justify-center mt-2">
              <button
                v-for="item in legend"
                :key="item.id"
                class="flex flex-row gap-1.5 place-items-center"
              >
                <div class="w-3 h-3">
                  <svg viewBox="0 0 2 2" class="w-full h-full">
                    <circle :cx="1" :cy="1" :r="1" :fill="item.color" />
                  </svg>
                </div>
                <span
                  class="text-gh-muted text-sm"
                  :class="item.isSegregated && 'line-through'"
                >
                  {{ item.name }}
                </span>
              </button>
            </div>
          </template>
        </VueUiXy>
      </div>
    </ClientOnly>
  </section>
</template>

<style scoped>
:deep(.vue-data-ui-component path),
:deep(.vue-data-ui-component circle) {
  transition: none !important;
}
</style>
