<script setup lang="ts">
import { ref, computed } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import utc from 'dayjs/plugin/utc'
import {
  VueUiRidgeline,
  type VueUiRidgelineConfig,
  type VueUiRidgelineDatasetItem,
} from 'vue-data-ui/vue-ui-ridgeline'
import { CLASSIFICATIONS_WITH_NAME_AND_CATEGORY } from '~~/shared/utils/charts.ts'

import 'vue-data-ui/style.css'
import ClassificationToggle from '../Activity/ClassificationToggle.vue'
import type { IdentityClassification } from '@unveil/identity'

dayjs.extend(isoWeek)
dayjs.extend(utc)

const { data: activity } = useActivity()

const rootEl = shallowRef<HTMLElement | null>(null)

onMounted(() => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)

const dates = computed(() => activity.value?.dates)
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const countsByDate = computed(() => activity.value?.countsByDate)
const selectedClassification = ref<IdentityClassification>('organic')

const dataset = computed<VueUiRidgelineDatasetItem[]>(() => {
  const classification = CLASSIFICATIONS_WITH_NAME_AND_CATEGORY.find(
    ({ category }) => category === selectedClassification.value,
  )

  if (!classification) {
    return []
  }

  const weeks = new Map<
    string,
    {
      monday: Dayjs
      percentages: Map<number, number>
    }
  >()

  for (const scanTime of dates.value ?? []) {
    const date = dayjs.utc(scanTime)

    if (!date.isValid()) {
      continue
    }

    const weekdayIndex = date.isoWeekday() - 1
    const monday = date.startOf('isoWeek')
    const weekKey = monday.format('YYYY-MM-DD')
    const week = weeks.get(weekKey) ?? {
      monday,
      percentages: new Map<number, number>(),
    }

    week.percentages.set(
      weekdayIndex,
      countsByDate.value?.[scanTime]?.[classification.category].percentage ?? 0,
    )

    weeks.set(weekKey, week)
  }

  return [...weeks.values()]
    .filter(({ percentages }) => percentages.size === WEEKDAYS.length)
    .sort((a, b) => a.monday.valueOf() - b.monday.valueOf())
    .map(({ monday, percentages }) => ({
      name: `${monday.format('YYYY-MM-DD')} - ${monday.add(6, 'day').format('YYYY-MM-DD')}`,
      datapoints: [
        {
          name: classification.name,
          values: WEEKDAYS.map((_, index) => percentages.get(index) ?? 0),
          color: colors.value[classification.category],
        },
      ],
    }))
})

const config = computed<VueUiRidgelineConfig>(() => ({
  userOptions: { show: false },
  style: {
    chart: {
      areas: {
        height: 60,
        rowHeight: 30,
        maxPoint: {
          adaptStrokeToBackground: false,
          stroke: colors.value.bg,
          strokeDasharray: 2,
        },
        stroke: {
          useSerieColor: true,
        },
      },
      backgroundColor: colors.value.bg,
      legend: { show: false },
      dialog: { show: false },
      padding: {
        top: 0,
        left: 0,
      },
      selector: {
        stroke: colors.value.bg,
        strokeDasharray: 0,
        dot: {
          radius: 3,
          stroke: colors.value.bg,
        },
        labels: {
          color: colors.value.text,
          fontSize: 10,
          formatter: ({ value }) => {
            return `${Math.round(value)}%`
          },
        },
      },
      xAxis: {
        labels: {
          values: WEEKDAYS,
          color: colors.value.textMuted,
          fontSize: 10,
          offsetY: -12,
        },
      },
      yAxis: {
        labels: {
          fontSize: 6.5,
          color: colors.value.textMuted,
          centered: true,
        },
      },
      zeroLine: { show: false },
    },
  },
}))
</script>

<template>
  <div>
    <div class="mb-5">
      <h2 class="text-center">Trends by week days</h2>
      <p class="text-sm text-ui-muted text-center">
        Daily ecosystem activity evolution split by weeks
      </p>
    </div>
    <div class="my-6 flex justify-center">
      <ClassificationToggle v-model="selectedClassification" />
    </div>
    <ClientOnly>
      <VueUiRidgeline :dataset :config> </VueUiRidgeline>
    </ClientOnly>
  </div>
</template>
