<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { VueUiXy, type VueUiXyDatasetItem, type VueUiXyConfig } from 'vue-data-ui/vue-ui-xy'
import { useTooltipPosition } from 'vue-data-ui/composables'

import { useColors } from '~/composables/useColors'
import { getClosedPrPercentageEvolutionTotal } from '~~/shared/utils/charts'
import { identityConfig } from '@unveil/identity'
import { round } from '~~/shared/utils/numbers'

import 'vue-data-ui/style.css'
const { data: ecosystemHealth } = await useEcosystemHealth()
const data = computed(() => ecosystemHealth.value?.results ?? [])
const dates = computed(() => ecosystemHealth.value?.dates)
const countsByDate = computed(() => ecosystemHealth.value?.countsByDate)

const chartContainer = useTemplateRef<HTMLElement>('chartContainer')
const { width, height } = useElementSize(chartContainer)

const hasStableChartDimensions = computed(() => width.value > 0 && height.value > 0)

const rootEl = shallowRef<HTMLElement | null>(null)
const chartRef = useTemplateRef('chartRef')

onMounted(() => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)

const automatedClosureRateData = computed(() => ({
  ...getClosedPrPercentageEvolutionTotal(data.value, [0, identityConfig.THRESHOLD_SUSPICIOUS]),
  scaleMin: 0,
  scaleMax: 100,
  color: 'grey',
  dashed: true,
}))

type VueUiXyDatasetItemWithTrends = VueUiXyDatasetItem & {
  trends: number[]
}

function composeRawDataset(): VueUiXyDatasetItemWithTrends[] {
  return [
    {
      name: 'Organic',
      series: dates.value?.map((date) => countsByDate.value?.[date]?.organic.percentage ?? 0) ?? [],
      trends: dates.value?.map((date) => countsByDate.value?.[date]?.organic.trend ?? 0) ?? [],
      color: colors.value.greenLine,
      type: 'line',
      smooth: true,
      useArea: true,
    },
    {
      name: 'Mixed',
      series: dates.value?.map((date) => countsByDate.value?.[date]?.mixed.percentage ?? 0) ?? [],
      trends: dates.value?.map((date) => countsByDate.value?.[date]?.mixed.trend ?? 0) ?? [],
      color: colors.value.amber,
      type: 'line',
      smooth: true,
      useArea: true,
    },
    {
      name: 'Automation',
      series:
        dates.value?.map((date) => countsByDate.value?.[date]?.automation.percentage ?? 0) ?? [],
      trends: dates.value?.map((date) => countsByDate.value?.[date]?.automation.trend ?? 0) ?? [],
      color: colors.value.dangerHover,
      type: 'line',
      smooth: true,
      useArea: true,
    },
  ]
}

const rawDataset = computed(() => composeRawDataset())

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
  automatedClosureRateData.value,
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

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  downsample: {
    threshold: 5000,
  },
  line: {
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
          values: ecosystemHealth.value?.scanTimes,
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

function getTrend({
  item,
  index,
}: {
  item: { slotAbsoluteIndex: number; name: string }
  index: number
}) {
  const trend = rawDataset.value[item.slotAbsoluteIndex]?.trends[index]

  return {
    formattedValue: formatTrend(trend),
    color: getTrendColor({ value: trend, reversed: item.name !== 'Organic' }),
    arrow: getTrendArrow(trend),
  }
}

/**
 * Temporary landmark for sample updates
 * We can remove it later if we don't notice any before/after trend shifts
 * The landmark is visible only when it is a week older than the last date of the dataset.
 */
const landmarks = [
  {
    date: '2026-06-12', // FIXME: for prod, replace with 2026-07-01
    name: 'Sample update',
    description: '13 repositories added to the dataset',
  },
]

const keyDates = computed(() => {
  const dateList = dates.value ?? []
  const lastDate = dateList.at(-1)
  if (!lastDate) {
    return []
  }

  const millisecondsInOneWeek = 7 * 24 * 60 * 60 * 1000
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
        visible: lastDateTime - landmarkDateTime >= millisecondsInOneWeek,
      }
    })
    .filter(Boolean)
})

const isChartHovered = shallowRef(false)

const visibleLandmarkByIndex = computed(() => {
  const landmarkMap = new Map<number, (typeof keyDates.value)[number]>()
  keyDates.value.forEach((landmark) => {
    if (landmark?.visible) {
      landmarkMap.set(landmark.index, landmark)
    }
  })
  return landmarkMap
})
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
          <VueUiXy v-if="hasStableChartDimensions" ref="chartRef" :dataset :config>
            <template #svg="{ svg }">
              <!-- LANDMARKS -->
              <g
                v-for="(plot, i) in svg?.data?.[0]?.plots"
                :key="`plot_${i}`"
                style="pointer-events: none"
              >
                <template
                  v-for="(landmark, j) in keyDates"
                  :key="`${landmark?.date}-${landmark?.name}-${j}`"
                >
                  <g v-if="landmark && landmark.index === i + svg.slicer.start && landmark.visible">
                    <!-- Landmark label -->
                    <text
                      :fill="colors.textMuted"
                      :stroke="colors.bg"
                      :opacity="isChartHovered ? 0.6 : 0"
                      stroke-width="3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      font-size="11"
                      :x="plot.x"
                      :y="svg.drawingArea.bottom - 4"
                      text-anchor="middle"
                      dominant-baseline="middle"
                      paint-order="stroke fill"
                      class="landmark-label"
                      style="pointer-events: none"
                    >
                      {{ landmark.name }}
                    </text>
                    <!-- Landmark icon -->
                    <g
                      :transform="`translate(${plot.x}, ${svg.drawingArea.bottom - 22})`"
                      class="hidden md:block"
                      style="pointer-events: all; cursor: default"
                      opacity="1"
                    >
                      <title>{{ landmark.name }}</title>
                      <g transform="translate(-7.68, -7.68) scale(0.64)">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          :stroke="colors.border"
                          stroke-width="2"
                          fill="none"
                        />
                        <path
                          d="M12 16v-4"
                          :stroke="colors.border"
                          stroke-width="2"
                          stroke-linecap="round"
                          fill="none"
                        />
                        <path
                          d="M12 8h.01"
                          :stroke="colors.border"
                          stroke-width="2"
                          stroke-linecap="round"
                          fill="none"
                        />
                      </g>
                    </g>
                  </g>
                </template>
              </g>
            </template>

            <template #area-gradient="{ series, id }">
              <linearGradient :id x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" :stop-color="series.color" stop-opacity="0.3" />
                <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
              </linearGradient>
            </template>

            <template #tooltip="{ datapoint, timeLabel, series }">
              <div class="flex flex-col">
                <div :style="{ color: colors.textMuted }" class="mb-1">
                  {{ timeLabel.text }}
                </div>
                <div
                  v-for="dp in datapoint"
                  :key="`${dp.name}-${dp.absoluteIndex}`"
                  class="flex flex-row gap-2 place-items-center"
                >
                  <div class="h-2 w-2">
                    <svg viewBox="0 0 2 2" class="w-full h-full">
                      <circle cx="1" cy="1" r="1" :fill="dp.color" />
                    </svg>
                  </div>
                  <span :style="{ color: colors.text }">{{ dp.name }}</span>
                  <span :style="{ color: colors.textMuted }">
                    {{ round(dp.value ?? 0, 1) + '%' }}
                  </span>

                  <!-- No trend is possible on the first datapoint -->
                  <template v-if="timeLabel.absoluteIndex > 0">
                    <span
                      v-if="dp.slotAbsoluteIndex < series.length - 1"
                      :class="[
                        getTrend({
                          item: dp,
                          index: timeLabel.absoluteIndex,
                        }).color,
                      ]"
                    >
                      <span
                        :class="[
                          getTrend({
                            item: dp,
                            index: timeLabel.absoluteIndex,
                          }).arrow,
                        ]"
                        class="shrink-0"
                        style="vertical-align: middle"
                      />
                      {{
                        getTrend({
                          item: dp,
                          index: timeLabel.absoluteIndex,
                        }).formattedValue
                      }}
                    </span>
                  </template>
                </div>

                <!-- LANDMARK INFO-->
                <div
                  v-if="visibleLandmarkByIndex.has(timeLabel.absoluteIndex)"
                  class="mt-2 text-xs text-gh-muted"
                >
                  <div class="flex flex-row gap-2 max-w-[200px]">
                    <span class="i-lucide:info w-6" />
                    <span
                      >{{ visibleLandmarkByIndex.get(timeLabel.absoluteIndex)?.name }}
                      :
                      {{ visibleLandmarkByIndex.get(timeLabel.absoluteIndex)?.description }}</span
                    >
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
</style>
