<script setup lang="ts">
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
  type VueUiXyDatasetLineItem,
  type VueUiXySvgSlotProps,
} from 'vue-data-ui/vue-ui-xy'
import { useTooltipPosition } from 'vue-data-ui/composables'
import { useElementSize } from '@vueuse/core'
import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { round } from '~~/shared/utils/numbers'
import type {
  TimezoneId,
  TimezoneWorkHours,
} from '~~/shared/types/tz-work-hours'

dayjs.extend(utc)
dayjs.extend(timezone)

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
    legend: { show: false, position: 'top' },
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    width: Math.round(width.value),
    height: 300,
    padding: {
      top: 12,
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

const SCAN_TIMEZONE = 'Europe/Paris'
const EXPLICIT_TIMEZONE_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i

function parseScanTime(scanTime: string) {
  const value = scanTime.trim()

  if (EXPLICIT_TIMEZONE_PATTERN.test(value)) {
    return dayjs(value).tz(SCAN_TIMEZONE)
  }

  return dayjs.tz(value, SCAN_TIMEZONE)
}

function getHourIndex(parisTime: Dayjs) {
  const exactIndex = scanTimes.value.findIndex((scanTime) => {
    const time = parseScanTime(scanTime)

    return time.isValid() && time.isSame(parisTime, 'hour')
  })

  if (exactIndex >= 0) {
    return exactIndex
  }

  return scanTimes.value.findIndex((scanTime) => {
    const time = parseScanTime(scanTime)

    return time.isValid() && time.hour() === parisTime.hour()
  })
}

type FogOfSleepRange = {
  start: number
  end: number
}

type FogOfSleepRect = {
  id: string
  x: number
  y: number
  width: number
  height: number
}

const selectedTimezoneId = ref<TimezoneId>('UTC+00:00')
const workHours = ref<TimezoneWorkHours>({})

function getTimeParts(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)

  if (!match) {
    return null
  }

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (hour > 23 || minute > 59) {
    return null
  }

  return { hour, minute }
}

function getUtcOffsetMinutes(timezoneId: TimezoneId) {
  const match = /^UTC([+-])(\d{2}):(\d{2})$/.exec(timezoneId)

  if (!match) {
    return null
  }

  const sign = match[1] === '+' ? 1 : -1
  const hours = Number(match[2])
  const minutes = Number(match[3])

  return sign * (hours * 60 + minutes)
}

function formatUtcOffset(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60

  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getScanTZ({
  localTime,
  timezoneId,
  referenceScanTime,
  nextDay = false,
}: {
  localTime: string
  timezoneId: TimezoneId
  referenceScanTime: string
  nextDay?: boolean
}) {
  const parts = getTimeParts(localTime)
  const offsetMinutes = getUtcOffsetMinutes(timezoneId)
  const referenceInParis = parseScanTime(referenceScanTime)

  if (!parts || offsetMinutes === null || !referenceInParis.isValid()) {
    return null
  }

  const referenceInSelectedTimezone = referenceInParis.utcOffset(offsetMinutes)

  const selectedDate = referenceInSelectedTimezone.format('YYYY-MM-DD')

  const offset = formatUtcOffset(offsetMinutes)

  let selectedDateTime = dayjs(
    `${selectedDate}T${String(parts.hour).padStart(2, '0')}:${String(
      parts.minute,
    ).padStart(2, '0')}:00${offset}`,
  )

  if (nextDay) {
    selectedDateTime = selectedDateTime.add(1, 'day')
  }

  return selectedDateTime.tz(SCAN_TIMEZONE)
}

const fogOfSleep = computed<FogOfSleepRange | null>(() => {
  const hours = workHours.value[selectedTimezoneId.value]
  const referenceScanTime = scanTimes.value.at(-1)

  if (!hours || !referenceScanTime) {
    return null
  }

  const startParts = getTimeParts(hours.start)
  const endParts = getTimeParts(hours.end)

  if (!startParts || !endParts) {
    return null
  }

  const startTotalMinutes = startParts.hour * 60 + startParts.minute
  const endTotalMinutes = endParts.hour * 60 + endParts.minute
  const endsNextDay = endTotalMinutes <= startTotalMinutes

  const startInParis = getScanTZ({
    localTime: hours.start,
    timezoneId: selectedTimezoneId.value,
    referenceScanTime,
  })
  const endInParis = getScanTZ({
    localTime: hours.end,
    timezoneId: selectedTimezoneId.value,
    referenceScanTime,
    nextDay: endsNextDay,
  })

  if (!startInParis || !endInParis) {
    return null
  }

  return {
    start: getHourIndex(startInParis),
    end: getHourIndex(endInParis),
  }
})

function getFogOfSleep(svg: VueUiXySvgSlotProps['svg']): FogOfSleepRect[] {
  const range = fogOfSleep.value
  const plots = svg.data[0]?.plots

  if (!range || !plots?.length || range.start < 0 || range.end < 0) {
    return []
  }

  // Equal boundaries represent a full 24-hour working day.
  if (range.start === range.end) {
    return []
  }

  const visibleStartIndex = svg.slicer.start
  const startPlot = plots[range.start - visibleStartIndex]
  const endPlot = plots[range.end - visibleStartIndex]

  if (!startPlot || !endPlot) {
    return []
  }

  const left = svg.drawingArea.left
  const right = svg.drawingArea.right
  const top = svg.drawingArea.top
  const bottom = svg.drawingArea.bottom
  const height = Math.max(0, bottom - top)
  const startX = Math.min(right, Math.max(left, startPlot.x))
  const endX = Math.min(right, Math.max(left, endPlot.x))

  const createRect = (
    id: string,
    x: number,
    width: number,
  ): FogOfSleepRect | null => {
    const safeWidth = Math.max(0, width)

    if (safeWidth === 0 || height === 0) {
      return null
    }

    return {
      id,
      x,
      y: top,
      width: safeWidth,
      height,
    }
  }

  // The workday is in the middle of the visible window. Sleep is on both sides.
  if (startX < endX) {
    return [
      createRect('sleep-before-work', left, startX - left),
      createRect('sleep-after-work', endX, right - endX),
    ].filter((rect): rect is FogOfSleepRect => rect !== null)
  }

  // The workday wraps around the left/right edges. Sleep is in the middle.
  return [createRect('sleep-between-work-periods', endX, startX - endX)].filter(
    (rect): rect is FogOfSleepRect => rect !== null,
  )
}
</script>

<template>
  <section ref="rootEl">
    <div class="mb-5">
      <h2 class="text-center">Hourly ecosystem health</h2>
      <p class="text-sm text-gh-muted text-center text-pretty">
        Same classification split as the health page, but sampled every hour.
        Only the last 25 scans are kept, so the first and last point sit exactly
        one day apart.
      </p>
    </div>

    <p v-if="!hasData" class="text-sm text-gh-muted text-center py-12">
      No hourly scan has been recorded yet.
    </p>

    <ClientOnly v-else>
      <div ref="chartContainer" class="w-full">
        <VueUiXy v-if="hasStableChartWidth" ref="chartRef" :dataset :config>
          <template #svg="{ svg }">
            <g aria-hidden="true" pointer-events="none">
              <rect
                v-for="rect in getFogOfSleep(svg)"
                :key="rect.id"
                :x="rect.x"
                :y="rect.y"
                :width="rect.width"
                :height="rect.height"
                :fill="colors.bg"
                fill-opacity="0.4"
                style="transition: all 0.2s"
              />
            </g>
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
                <div class="w-2 h-2">
                  <svg viewBox="0 0 2 2" class="w-full h-full">
                    <circle :cx="1" :cy="1" :r="1" :fill="item.color" />
                  </svg>
                </div>
                <span
                  class="text-gh-muted text-sm"
                  :class="item.isSegregated && 'line-through'"
                >
                  {{ item.name.toLowerCase() }}
                </span>
              </button>
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
              v-if="absoluteIndex % (isMobile ? 4 : 2) === 0"
              :x="x"
              :y="y + fontSize"
              :font-size="fontSize"
              :fill="fill"
              :text-anchor="textAnchor"
            >
              {{ content }}
            </text>
          </template>
        </VueUiXy>
      </div>
    </ClientOnly>

    <CommonTimezoneWorkHoursSelector
      v-if="hasData"
      v-model="workHours"
      v-model:timezone="selectedTimezoneId"
      class="mx-auto mb-5"
    />
  </section>
</template>

<style scoped>
:deep(.vue-data-ui-component path),
:deep(.vue-data-ui-component circle) {
  transition: none !important;
}
</style>
