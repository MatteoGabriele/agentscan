<script setup lang="ts">
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
} from 'vue-data-ui/vue-ui-xy'
import { useTooltipPosition } from 'vue-data-ui/composables'
import { useElementSize } from '@vueuse/core'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { round } from '~~/shared/utils/numbers'
import EventsEvolutionTooltipTable from './EventsEvolutionTooltipTable.vue'

dayjs.extend(utc)

import('vue-data-ui/style.css')

const { data: hourlyWindow } = await useEcosystemHealthHourlyWindow()

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

type HourlySerie = VueUiXyDatasetItem & {
  category: EcosystemHealthCategory
  trends: number[]
  counts: number[]
  totals: number[]
}

const classifications: Array<{
  name: string
  category: EcosystemHealthCategory
}> = [
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
  classifications.map(({ name, category }) => ({
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

            <template #tooltip="{ datapoint, timeLabel, series }">
              <div class="flex flex-col">
                <div :style="{ color: colors.textMuted }" class="mb-1">
                  {{ formatScanTime(timeLabel.absoluteIndex) }}
                </div>

                <EventsEvolutionTooltipTable
                  :tooltip-slot-props="{ datapoint, timeLabel, series }"
                  :colors
                  :can-compare="timeLabel.absoluteIndex > 0"
                  :rawDataset
                >
                  <template #thead>
                    <th class="px-2 text-center">vs Hour-1</th>
                    <th class="px-2 text-left">Trend</th>
                  </template>
                </EventsEvolutionTooltipTable>
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
