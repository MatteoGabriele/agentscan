<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import {
  VueUiXy,
  type VueUiXyDatasetItem,
  type VueUiXyConfig,
  type VueUiXySvgSlotProps,
} from 'vue-data-ui/vue-ui-xy'
import { useTooltipPosition } from 'vue-data-ui/composables'
import { useColors } from '~/composables/useColors'

import 'vue-data-ui/style.css'
import { useIsMobile } from '~/composables/useIsMobile'
import { landmarks, type Landmark } from './global-events-evolution-landmarks'
import type { EventsEvolutionSeries } from '~~/shared/types/activity'
import {
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY,
  SVG_ICON,
} from '~~/shared/utils/charts.ts'

const { data: activity } = useActivity()

const chartContainer = useTemplateRef<HTMLElement>('chartContainer')
const { width, height } = useElementSize(chartContainer)
const isMobile = useIsMobile()

const MOBILE_SLICE_DAYS = 14

const LANDMARK_LABEL_FONT_SIZE = 11
// Rough average glyph width at the label font size, used to keep the label inside the chart
const LANDMARK_LABEL_CHAR_WIDTH = 5.6
const LANDMARK_LABEL_PADDING = 4

const dates = computed(() =>
  activity.value?.dates.slice(isMobile.value ? -MOBILE_SLICE_DAYS : 0),
)

const scanTimes = computed(() =>
  activity.value?.scanTimes.slice(isMobile.value ? -MOBILE_SLICE_DAYS : 0),
)

const countsByDate = computed(() => activity.value?.countsByDate)

const prCounts = computed(() =>
  (dates.value ?? []).map(
    (scanTime) => countsByDate.value?.[scanTime]?.total.count ?? 0,
  ),
)

const hasStableChartDimensions = computed(
  () => width.value > 0 && height.value > 0,
)

const rootEl = shallowRef<HTMLElement | null>(null)
const chartRef = useTemplateRef('chartRef')

onMounted(() => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)

const rawDataset = computed<EventsEvolutionSeries[]>(() =>
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY.map(({ name, category }) => ({
    name,
    category,
    series: (dates.value ?? []).map(
      (scanTime) => countsByDate.value?.[scanTime]?.[category].percentage ?? 0,
    ),
    trends: (dates.value ?? []).map(
      (scanTime) => countsByDate.value?.[scanTime]?.[category].trend ?? 0,
    ),
    counts: (dates.value ?? []).map(
      (scanTime) => countsByDate.value?.[scanTime]?.[category].count ?? 0,
    ),
    totals: (dates.value ?? []).map(
      (scanTime) => countsByDate.value?.[scanTime]?.total.count ?? 0,
    ),
    color: colors.value[category],
    type: 'line',
    smooth: true,
    useArea: true,
  })),
)

const max = computed(() => {
  const values = rawDataset.value.flatMap((datasetItem) =>
    (datasetItem.series as Array<number | null>).map((point) => point ?? 0),
  )

  return values.length > 0 ? Math.max(...values) : 0
})

const dataset = computed<VueUiXyDatasetItem[]>(() => [
  ...rawDataset.value.map((datasetItem) => ({
    ...datasetItem,
    scaleMax: max.value,
  })),
])

const tooltipPosition = useTooltipPosition(chartRef)

const progressionLabelOffsetX = 6

const viewBoxPadding = computed(() => {
  const maxSeries = dates.value?.length ?? 0

  if (maxSeries <= 1 || width.value <= 0) {
    return { left: 0, right: 0 }
  }

  const halfVueUiXyDatapointStep = width.value / (2 * (maxSeries - 1))

  return {
    left: -halfVueUiXyDatapointStep,
    right: -halfVueUiXyDatapointStep - progressionLabelOffsetX,
  }
})

const tooltipTimeFormat = 'dddd • MMM dd • HH:mm'

const hoveredIndex = ref<number | null>(null)

const config = computed<VueUiXyConfig>(() => ({
  events: {
    datapointEnter: ({ seriesIndex }) => {
      hoveredIndex.value = seriesIndex
    },
    datapointLeave: () => (hoveredIndex.value = null),
  },
  useCssAnimation: false,
  downsample: {
    threshold: 5000,
  },
  line: {
    strokeWidth: isMobile.value ? 1 : 3,
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
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    width: Math.round(width.value),
    height: Math.round(height.value),
    padding: {
      left: viewBoxPadding.value.left,
      right: viewBoxPadding.value.right,
    },
    grid: {
      position: 'middle',
      stroke: 'transparent',
      labels: {
        show: false,
        yAxis: {
          crosshairSize: 0,
          useIndividualScale: true,
        },
        xAxisLabels: {
          show: false,
          values: scanTimes.value,
          datetimeFormatter: {
            enable: true,
            useUTC: false,
            locale: 'en',
            options: {
              year: tooltipTimeFormat,
              month: tooltipTimeFormat,
              day: tooltipTimeFormat,
              minute: tooltipTimeFormat,
              second: tooltipTimeFormat,
            },
          },
        },
      },
    },
    highlighter: {
      opacity: 1,
      color: colors.value.text,
      useLine: true,
    },
    legend: { show: false },
    tooltip: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 30,
      position: tooltipPosition.value,
      offsetX: 24,
      offsetY: -64,
    },
    zoom: { show: false },
  },
}))

const keyDates = computed(() => {
  const dateList = dates.value ?? []
  const lastDate = dateList.at(-1)
  if (!lastDate) {
    return []
  }

  const millisecondsInADay = 1 * 24 * 60 * 60 * 1000
  const lastDateTime = new Date(lastDate).getTime()

  return landmarks
    .map((item) => {
      const index = dateList.indexOf(item.date)
      if (index === -1) {
        return null
      }
      const landmarkDateTime = new Date(item.date).getTime()

      return {
        ...item,
        index,
        visible: lastDateTime - landmarkDateTime >= millisecondsInADay,
      }
    })
    .filter(Boolean)
})

const isChartHovered = shallowRef(false)

const visibleLandmarksByIndex = computed(() => {
  const landmarkMap = new Map<number, Landmark[]>()
  keyDates.value.forEach((landmark) => {
    if (!landmark?.visible) {
      return
    }
    const existingLandmarks = landmarkMap.get(landmark.index) ?? []
    landmarkMap.set(landmark.index, [...existingLandmarks, landmark])
  })
  return landmarkMap
})

/**
 * "Stack 'em, pack 'em and rack 'em" - Die Hard 2
 */
const landmarkGroups = computed(() =>
  [...visibleLandmarksByIndex.value.entries()].flatMap(([index, items]) => {
    const first = items[0]
    if (!first) {
      return []
    }

    const isGrouped = items.length > 1

    return [
      {
        index,
        count: items.length,
        name: isGrouped ? `${items.length} updates` : first.name,
        title: items.map((item) => item.name).join(' + '),
        iconSvg: isGrouped ? SVG_ICON.layers : first.iconSvg,
        series: isGrouped ? undefined : first.series,
        offsetY: isGrouped ? undefined : first.offsetY,
      },
    ]
  }),
)

/**
 * Landmarks close to the first or last date would render their centered label
 * outside of the chart, where it gets cut off. Keeping the label anchored in
 * the middle
 */
function placeLandmarkLabelX({
  svg,
  name,
  x,
}: {
  svg: VueUiXySvgSlotProps['svg']
  name: string
  x: number
}): number {
  const halfLabelWidth = (name.length * LANDMARK_LABEL_CHAR_WIDTH) / 2
  const minX = LANDMARK_LABEL_PADDING + halfLabelWidth
  const maxX = svg.width - LANDMARK_LABEL_PADDING - halfLabelWidth

  if (minX > maxX) {
    return svg.width / 2
  }

  return Math.min(Math.max(x, minX), maxX)
}

function placeLandmark({
  svg,
  landmark,
  plotIndex,
}: {
  svg: VueUiXySvgSlotProps['svg']
  landmark: Pick<Landmark, 'series' | 'offsetY'>
  plotIndex: number
}): {
  translate: string // for the landmark group wrapper
  y: number // can be used for the landmark label
} {
  const fallbackY = svg.drawingArea.bottom - 22
  const x = svg.data?.[0]?.plots?.[plotIndex]?.x ?? 0

  if (!landmark.series) {
    return {
      translate: `translate(${x}, ${fallbackY})`,
      y: fallbackY,
    }
  }

  const seriesName = landmark.series.toLowerCase()
  const seriesIndex = dataset.value.findIndex(
    (item) => item.name.toLowerCase() === seriesName,
  )

  const y =
    (svg.data?.[seriesIndex]?.plots?.[plotIndex]?.y ?? fallbackY) +
    (landmark.offsetY ?? 0)

  return {
    translate: `translate(${x}, ${y})`,
    y,
  }
}
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
              <ChartPrVolumeLine
                :svg
                :counts="prCounts"
                :color="colors.textMuted"
                :background-color="colors.bg"
                :visible="isChartHovered || isMobile"
                :stroke-width="isMobile ? 1.5 : 2"
                :hovered-index="hoveredIndex"
              />

              <!-- LANDMARKS -->
              <g
                v-for="(plot, i) in svg?.data?.[0]?.plots"
                :key="`plot_${i}`"
                style="pointer-events: none"
              >
                <template
                  v-for="landmark in landmarkGroups"
                  :key="`${landmark.index}-${landmark.name}`"
                >
                  <g v-if="landmark.index === i + svg.slicer.start">
                    <!-- Landmark label -->
                    <text
                      :fill="colors.textMuted"
                      :stroke="colors.bg"
                      :opacity="isChartHovered ? 1 : 0"
                      stroke-width="8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      :font-size="LANDMARK_LABEL_FONT_SIZE"
                      :x="
                        placeLandmarkLabelX({
                          svg,
                          name: landmark.name,
                          x: plot.x,
                        })
                      "
                      :y="svg.drawingArea.bottom - 4"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      paint-order="stroke fill"
                      class="landmark-label hidden md:block"
                      style="pointer-events: none"
                    >
                      {{ landmark.name }}
                    </text>
                    <!-- Landmark icon -->
                    <g
                      :transform="
                        placeLandmark({ svg, landmark, plotIndex: i }).translate
                      "
                      class="hidden md:block"
                      style="pointer-events: all; cursor: default"
                      opacity="1"
                    >
                      <title>{{ landmark.title }}</title>
                      <circle r="12" :fill="colors.bg" />
                      <!-- eslint-disable vue/no-v-text-v-html-on-component, vue/no-v-html -->
                      <g
                        transform="translate(-7.68, -7.68) scale(0.64)"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        fill="none"
                        v-html="landmark.iconSvg"
                      />
                      <!-- eslint-disable vue/no-v-text-v-html-on-component, vue/no-v-html -->
                      <!-- Number of landmarks sharing the same day -->
                      <text
                        v-if="landmark.count > 1"
                        :fill="colors.textMuted"
                        :stroke="colors.bg"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        paint-order="stroke fill"
                        font-size="10"
                        x="11"
                        y="-8"
                        text-anchor="middle"
                        dominant-baseline="middle"
                      >
                      </text>
                    </g>
                  </g>
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

            <template #tooltip="{ datapoint, timeLabel, series }">
              <div class="flex flex-col tabular-nums">
                <ChartEventsEvolutionTooltipHeader
                  :time-label="timeLabel.text"
                />

                <ChartEventsEvolutionTooltipTable
                  :tooltip-slot-props="{ datapoint, timeLabel, series }"
                  :colors
                  :can-compare="timeLabel.absoluteIndex > 0"
                  :raw-dataset="rawDataset"
                  :pr-counts="prCounts"
                >
                  <template #thead>
                    <th class="px-2 text-center">vs Day-1</th>
                    <th class="px-2 text-left">Trend</th>
                  </template>
                </ChartEventsEvolutionTooltipTable>

                <!-- LANDMARK INFO -->
                <div
                  v-if="visibleLandmarksByIndex.has(timeLabel.absoluteIndex)"
                  class="mt-2 flex flex-col gap-2 text-xs text-ui-muted"
                >
                  <div
                    v-for="landmark in visibleLandmarksByIndex.get(
                      timeLabel.absoluteIndex,
                    ) ?? []"
                    :key="`${landmark.date}-${landmark.name}-${landmark.series ?? 'global'}`"
                    class="flex flex-row gap-2 max-w-[280px]"
                  >
                    <span class="w-6 shrink-0" :class="landmark.icon" />

                    <span>
                      {{ landmark.name }}:
                      {{ landmark.description }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </VueUiXy>
        </Transition>
      </ClientOnly>
    </div>
  </div>
</template>

<style>
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

.landmark-label {
  transition: all 250ms ease !important;
}

.vue-data-ui-tooltip {
  min-width: fit-content !important;
}
</style>
