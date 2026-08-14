<script setup lang="ts">
import {
  VueUiHeatmap,
  type VueUiHeatmapConfig,
  type VueUiHeatmapDatapoint,
  type VueUiHeatmapDatasetItem,
} from 'vue-data-ui/vue-ui-heatmap'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import { mergeConfigs } from 'vue-data-ui/utils'
import { round } from '~~/shared/utils/numbers'
import { useTimeout } from '@vueuse/core'

import('vue-data-ui/style.css')

dayjs.extend(isoWeek)

type EcosystemHealthCategory = 'organic' | 'mixed' | 'automation'

type EcosystemHealthHeatmapSource = {
  dates: string[]
  countsByDate: Record<
    string,
    {
      organic?: {
        percentage?: number
      }
      mixed?: {
        percentage?: number
      }
      automation?: {
        percentage?: number
      }
    }
  >
}

const { data: ecosystemHealth } = await useEcosystemHealth()
const rootEl = shallowRef<HTMLElement | null>(null)

onMounted(() => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)

const ready = shallowRef(false)

useTimeout(200, {
  callback: () => (ready.value = true),
})

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const dayIndexes = daysOfWeek.reduce(
  (accumulator, dayName, dayIndex) => {
    accumulator[dayName] = dayIndex
    return accumulator
  },
  {} as Record<string, number>,
)

const timestamps = computed(() => ecosystemHealth.value?.dates ?? [])

const weekKeys = computed(() => {
  return [
    ...new Set(
      timestamps.value.map((timestamp) =>
        dayjs(timestamp).startOf('isoWeek').format('YYYY-MM-DD'),
      ),
    ),
  ].sort()
})

const weekLabels = computed(() => {
  return weekKeys.value.map((weekKey) => {
    const start = dayjs(weekKey)
    const end = start.endOf('isoWeek')

    return `${start.format('MMM D')} - ${end.format('MMM D')}`
  })
})

const heatmapSeries = computed(
  (): Array<{
    key: EcosystemHealthCategory
    name: string
    color: string
  }> => [
    {
      key: 'organic',
      name: 'Organic',
      color: colors.value.organic!,
    },
    {
      key: 'mixed',
      name: 'Mixed',
      color: colors.value.mixed!,
    },
    {
      key: 'automation',
      name: 'Automation',
      color: colors.value.automation!,
    },
  ],
)

function createHeatmapDataset(
  ecosystemHealth: EcosystemHealthHeatmapSource,
  category: EcosystemHealthCategory,
): VueUiHeatmapDatasetItem[] {
  const valuesByWeekAndDay = new Map<string, number[]>()

  ecosystemHealth.dates.forEach((dateString) => {
    const date = dayjs(dateString)
    const weekKey = date.startOf('isoWeek').format('YYYY-MM-DD')
    const dayIndex = date.isoWeekday() - 1

    const weekValues =
      valuesByWeekAndDay.get(weekKey) ?? Array<number>(7).fill(0)

    weekValues[dayIndex] =
      ecosystemHealth.countsByDate[dateString]?.[category]?.percentage ?? 0

    valuesByWeekAndDay.set(weekKey, weekValues)
  })

  return daysOfWeek.map((dayName, dayIndex) => ({
    name: dayName,
    values: weekKeys.value.map(
      (weekKey) => valuesByWeekAndDay.get(weekKey)?.[dayIndex] ?? 0,
    ),
  }))
}

const numberOfWeeks = computed(() => weekKeys.value.length)

const baseConfig = computed<VueUiHeatmapConfig>(() => ({
  userOptions: {
    show: false,
  },
  style: {
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    layout: {
      width: 43 + numberOfWeeks.value * 32,
      cells: {
        spacing: 0,
        colors: {
          cold: colors.value.bg,
        },
        selected: {
          border: 2,
          color: colors.value.text,
        },
        value: {
          show: false,
        },
      },
      dataLabels: {
        xAxis: {
          show: true,
          color: colors.value.textMuted,
          values: weekLabels.value,
        },
        yAxis: {
          color: colors.value.textMuted,
        },
      },
    },
    legend: {
      show: false,
    },
    tooltip: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 70,
    },
  },
}))

function createHeatmapConfig(hotColor: string): VueUiHeatmapConfig {
  return mergeConfigs({
    defaultConfig: baseConfig.value,
    userConfig: {
      style: {
        layout: {
          cells: {
            colors: {
              hot: hotColor,
            },
          },
        },
      },
    },
  })
}

const heatmaps = computed(() => {
  return heatmapSeries.value.map((seriesItem) => ({
    name: seriesItem.name,
    color: seriesItem.color,
    dataset: ecosystemHealth.value
      ? createHeatmapDataset(
          ecosystemHealth.value as EcosystemHealthHeatmapSource,
          seriesItem.key,
        )
      : [],
    config: createHeatmapConfig(seriesItem.color),
  }))
})

function getDateFromHeatmapCell(datapoint: VueUiHeatmapDatapoint): string {
  const xName = datapoint?.xAxisName ?? ''
  const yName = datapoint?.yAxisName ?? ''

  const weekIndex = weekLabels.value.indexOf(xName)
  const weekKey = weekKeys.value[weekIndex]

  if (!weekKey) {
    return ''
  }

  const targetDate = dayjs(weekKey).add(dayIndexes[yName] ?? 0, 'day')

  return targetDate.format('DD MMM (ddd)')
}
</script>

<template>
  <div
    class="mb-5 transition-opacity"
    :style="{
      opacity: ready ? 1 : 0,
    }"
  >
    <h2 class="text-center">Daily ecosystem health heatmap</h2>
  </div>
  <div
    class="flex w-full flex-col items-center gap-6 px-12 md:flex-row md:px-0 transition-opacity"
    :style="{
      opacity: ready ? 1 : 0,
    }"
  >
    <ClientOnly>
      <VueUiHeatmap
        v-for="heatmap in heatmaps"
        :key="heatmap.name"
        :dataset="heatmap.dataset"
        :config="heatmap.config"
      >
        <template #tooltip="{ datapoint }">
          <div class="mb-1" :style="{ color: colors.textMuted }">
            {{ getDateFromHeatmapCell(datapoint) }}
          </div>

          <div class="flex flex-row items-center gap-2">
            <div class="h-2 w-2">
              <svg viewBox="0 0 2 2" class="h-full w-full">
                <circle cx="1" cy="1" r="1" :fill="heatmap.color" />
              </svg>
            </div>

            <span>{{ heatmap.name }}</span>

            <span :style="{ color: colors.textMuted }">
              {{ round(datapoint.value ?? 0, 1) + '%' }}
            </span>
          </div>
        </template>
      </VueUiHeatmap>
    </ClientOnly>
  </div>
</template>

<style scoped>
:deep(rect) {
  shape-rendering: crispEdges !important;
}
</style>
