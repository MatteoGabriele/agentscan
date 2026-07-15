<script setup lang="ts">
import { computed } from 'vue'
import {
  VueUiStackbar,
  type VueUiStackbarConfig,
  type VueUiStackbarDatasetItem,
} from 'vue-data-ui/vue-ui-stackbar'
import {
  CLASSIFICATION_CATEGORIES,
  getClassificationByDateChunks,
} from '~~/shared/utils/count-classification-by-date'
import { formatDateRange } from '~~/shared/utils/dates'

import('vue-data-ui/style.css')

const { data } = useEcosystemHealthCurrentWeek()

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)

const dates = computed(() => data.value?.dates ?? [])
const results = computed(() => data.value?.results ?? [])

const classification = computed(() => {
  return getClassificationByDateChunks({
    data: results.value,
    dates: dates.value,
    days: 7,
    rolling: false, // true = rolling weeks; false = monday-sunday weeks (incomplete weeks won't show)
  }).toReversed()
})

const palette = computed(() => ({
  organic: colors.value.green,
  mixed: colors.value.amber,
  automation: colors.value.red,
}))

const stackbarDataset = computed<VueUiStackbarDatasetItem[]>(() => {
  return CLASSIFICATION_CATEGORIES.map((classificationKey) => {
    return {
      name: classificationKey,
      series: classification.value.map((week) => {
        return week.classification[classificationKey].percentage
      }),
      color: palette.value[classificationKey],
    }
  })
})

const chartHeight = computed(() => {
  return classification.value.length * 40
})

const timeLabels = computed<string[]>(() => {
  return classification.value.map((week, index) => {
    const weekNumber = classification.value.length - index

    return `Week ${weekNumber} (${formatDateRange({
      startDate: week.startDate,
      endDate: week.endDate,
      startYear: false,
      endYear: true,
      locale: 'en-GB',
    })})`
  })
})
const stackbarConfig = computed<VueUiStackbarConfig>(() => ({
  orientation: 'horizontal',
  userOptions: { show: false },
  useCssAnimation: false,
  style: {
    chart: {
      backgroundColor: colors.value.bg,
      height: chartHeight.value,
      bars: {
        distributed: true,
        totalValues: { show: false },
        gradient: { show: false },
      },
      legend: {
        backgroundColor: colors.value.bg,
        position: 'top',
        color: colors.value.textMuted,
      },
      grid: {
        x: {
          showAxis: false,
          timeLabels: {
            values: timeLabels.value,
          },
        },
        y: {
          axisLabels: {
            color: colors.value.textMuted,
          },
        },
      },
      tooltip: { show: false },
      zoom: { show: false },
    },
  },
}))
</script>

<template>
  <div class="mb-5">
    <h2 class="text-center">Weekly classification breakdown</h2>
    <p class="text-sm text-gh-muted text-center">
      A new weekly data point is added after each Sunday scan
    </p>
  </div>
  <div class="flex flex-col gap-4 weekly-classification">
    <ClientOnly>
      <VueUiStackbar :dataset="stackbarDataset" :config="stackbarConfig">
        <template #legend="{ legend }">
          <div class="flex flex-row gap-4 justify-center mt-2">
            <button
              v-for="item in legend"
              :key="item.id"
              class="flex flex-row gap-1.5 place-items-center"
              :class="item.isSegregated ? 'opacity-50' : 'hover:underline'"
              @click="item.segregate()"
            >
              <div class="w-2 h-2">
                <svg viewBox="0 0 2 2" class="w-full h-full">
                  <circle :cx="1" :cy="1" :r="1" :fill="item.color" />
                </svg>
              </div>
              <div
                :class="`text-gh-muted text-sm ${item.isSegregated ? 'line-through' : ''}`"
              >
                {{ item.name }}
              </div>
            </button>
          </div>
        </template>
      </VueUiStackbar>
    </ClientOnly>
  </div>
</template>
