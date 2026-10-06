<script setup lang="ts">
import { computed } from 'vue'
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
  type VueUiXySvgSlotProps,
} from 'vue-data-ui/vue-ui-xy'
import type { ActivityCategory } from '~~/shared/types/activity'
import {
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY,
  SWATCH,
} from '~~/shared/utils/charts'
import { formatCompactNumber } from '~~/shared/utils/numbers'

import('vue-data-ui/style.css')

interface Props {
  data: {
    iso: string
    label: string
    categories: {
      prs: number
      added: number | null
      deleted: number | null
      name: string
      category: ActivityCategory
    }[]
  }[]
  type: 'hourly' | 'daily'
}

const props = defineProps<Props>()

const rootEl = shallowRef<HTMLElement | null>(null)
onMounted(() => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)

function getSeries(type: 'added' | 'deleted', cat: ActivityCategory) {
  return props.data.map((item) => {
    const category = item.categories.find(
      (category) => category.category === cat,
    )

    const value = category?.[type] ?? 0

    return Math.round(type === 'added' ? value : -value)
  })
}

function makeDatasets(cat: ActivityCategory): VueUiXyDatasetItem[] {
  return [
    {
      name: 'Lines added',
      type: 'line',
      series: getSeries('added', cat),
      color: colors.value.organic,
      smooth: true,
      useArea: true,
      dataLabels: false,
      isPositive: true,
    },
    {
      name: 'Lines deleted',
      type: 'line',
      series: getSeries('deleted', cat),
      color: colors.value.automation,
      smooth: true,
      useArea: true,
      dataLabels: false,
      isPositive: false,
    },
  ]
}

const datasets = computed<
  Array<{
    category: ActivityCategory
    label: string
    data: VueUiXyDatasetItem[]
  }>
>(() =>
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY.map((classification) => ({
    category: classification.category,
    label: classification.name,
    data: makeDatasets(classification.category),
  })),
)

const dates = computed(() => props.data.map((d) => d.iso))

const minMax = computed(() => {
  const values = datasets.value.flatMap((category) =>
    category.data.flatMap((item) =>
      (item.series as number[]).map((n) => n ?? 0),
    ),
  )

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  }
})

const selectedXIndex = ref<number | undefined>(undefined)

const XAXIS_LABELS_MOD_THRESHOLD = 4

const config = computed<VueUiXyConfig>(() => ({
  events: {
    datapointEnter: ({ seriesIndex }) => (selectedXIndex.value = seriesIndex),
    datapointLeave: () => (selectedXIndex.value = undefined),
  },

  line: {
    useGradient: false,
    strokeWidth: 2,
    dot: {
      useSerieColor: false,
      fill: '',
      strokeWidth: 1,
    },
    labels: {
      show: true,
      color: colors.value.text,
      offsetY: -10,
      formatter: ({ value }) =>
        `${value > 0 ? '+' : ''}${formatCompactNumber(value)}`,
    },
  },

  chart: {
    height: 200,
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    padding: {
      left: -20,
      top: 12,
      bottom: 24,
    },
    grid: {
      labels: {
        show: false,
        fontSize: 0,
        xAxisLabels: {
          color: colors.value.textMuted,
          values: dates.value,
          datetimeFormatter: {
            enable: true,
          },
        },
        yAxis: {
          useNiceScale: false,
          scaleMin: minMax.value.min,
          scaleMax: minMax.value.max,
        },
      },
      stroke: 'transparent',
    },
    highlighter: {
      useLine: true,
      color: colors.value.textMuted,
    },
    labels: {
      fontSize: 20,
    },
    legend: {
      show: false,
    },
    tooltip: {
      show: false,
    },
    userOptions: { show: false },
    zoom: {
      show: false,
    },
  },
}))

function getZeroY(svg: VueUiXySvgSlotProps['svg']) {
  const { height, top } = svg.drawingArea
  const max = minMax.value.max + Math.abs(minMax.value.min)
  return Number.isFinite(max) && max > 0
    ? top + height * (minMax.value.max / max)
    : top + height / 2
}
</script>

<template>
  <div ref="chartContainer" class="flex flex-col gap-2">
    <div
      v-for="(classification, index) in datasets"
      :key="index"
      class="min-w-0"
    >
      <dt class="flex items-center gap-2 text-xs text-ui-muted">
        <span
          aria-hidden="true"
          class="h-2.5 w-2.5 shrink-0 rounded-full"
          :class="SWATCH[classification.category]"
        />
        {{ classification.label }}
      </dt>
      <VueUiXy
        :selected-x-index="selectedXIndex"
        :dataset="classification.data"
        :config="config"
      >
        <template
          #time-label="{
            x,
            y,
            fontSize,
            fill,
            content,
            textAnchor,
            absoluteIndex,
          }"
        >
          <text
            v-if="
              absoluteIndex % XAXIS_LABELS_MOD_THRESHOLD === 1 ||
              absoluteIndex === selectedXIndex
            "
            :x="x"
            :y="y + 48"
            :font-size="fontSize"
            :fill="fill"
            :text-anchor="textAnchor"
            :style="{
              transition: 'opacity 0.2s',
              opacity:
                selectedXIndex === undefined || selectedXIndex === absoluteIndex
                  ? 1
                  : 0.3,
            }"
          >
            {{ content }}
          </text>
        </template>

        <template #area-gradient="{ series, id }">
          <linearGradient
            v-if="series.isPositive"
            :id
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop offset="0%" :stop-color="series.color" stop-opacity="0.5" />
            <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
          </linearGradient>

          <linearGradient v-else :id x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" :stop-color="colors.bg" stop-opacity="0" />
            <stop offset="100%" :stop-color="series.color" stop-opacity="0.5" />
          </linearGradient>
        </template>

        <template #svg="{ svg }">
          <!-- Zero baseline axis -->
          <line
            :x1="svg.drawingArea.left + 18"
            :x2="svg.drawingArea.right - 18"
            :y1="getZeroY(svg)"
            :y2="getZeroY(svg)"
            :stroke="colors.border"
            stroke-dasharray="0.5 4"
          />
        </template>
      </VueUiXy>
    </div>
  </div>
</template>
