<script setup lang="ts">
import { computed } from 'vue'
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
} from 'vue-data-ui/vue-ui-xy'
import type { ActivityCategory } from '~~/shared/types/activity'
import { formatCompactNumber } from '~~/shared/utils/numbers'

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

const SWATCH: Record<ActivityCategory, string> = {
  organic: 'bg-ui-organic',
  mixed: 'bg-ui-mixed',
  automation: 'bg-ui-automation',
}

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

const categories: ActivityCategory[] = ['organic', 'mixed', 'automation']
const categoryNames: Record<ActivityCategory, string> = {
  organic: 'Organic',
  mixed: 'Mixed',
  automation: 'Automation',
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
    },
    {
      name: 'Lines deleted',
      type: 'line',
      series: getSeries('deleted', cat),
      color: colors.value.automation,
      smooth: true,
      useArea: true,
      dataLabels: false,
    },
  ]
}

const datasets = computed<
  Array<{ name: ActivityCategory; data: VueUiXyDatasetItem[] }>
>(() =>
  categories.map((cat) => ({
    name: cat,
    data: makeDatasets(cat),
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
      top: -12,
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
          useNiceScale: true,
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
          :class="SWATCH[classification.name]"
        />
        {{ categoryNames[classification.name] }}
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
            :x="x"
            :y="y + 24"
            :font-size="fontSize"
            :fill="fill"
            :text-anchor="textAnchor"
            v-if="
              absoluteIndex % XAXIS_LABELS_MOD_THRESHOLD === 1 ||
              absoluteIndex === selectedXIndex
            "
          >
            {{ content }}
          </text>
        </template>

        <template #area-gradient="{ series, id }">
          <linearGradient :id x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" :stop-color="series.color" stop-opacity="0.5" />
            <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
          </linearGradient>
        </template>
      </VueUiXy>
    </div>
  </div>
</template>
