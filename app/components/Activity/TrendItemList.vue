<script setup lang="ts">
import type { ActivityCategory } from '~~/shared/types/activity'

type ClassificationStats = Record<
  ActivityCategory,
  { count: number; percentage: string }
>

const { view = 'daily' } = defineProps<{
  view?: 'daily' | 'hourly'
}>()

const isHourly = computed(() => view === 'hourly')

const { data: activity } = await useActivity()
const { data: hourlyWindow, execute: loadHourlyWindow } =
  useActivityHourlyWindow({ immediate: false })

watch(
  isHourly,
  (hourly) => {
    if (hourly) {
      loadHourlyWindow()
    }
  },
  { immediate: true },
)

const entries = computed(() => activity.value?.entries ?? [])

const categoryProgression = computed(() => {
  return isHourly.value
    ? hourlyWindow.value?.categoryProgression
    : activity.value?.categoryProgression
})

const stats = computed<ClassificationStats | null>(() => {
  if (isHourly.value) {
    // Totals over the whole scan window the hourly chart plots, not the last scan
    return getActivityStatsByBuckets(
      hourlyWindow.value?.countsByScanTime,
      hourlyWindow.value?.scanTimes,
    )
  }

  return getDailyActivityStats(entries.value)
})
</script>

<template>
  <ul
    class="text-center flex flex-col md:flex-row gap-2 items-center md:text-left w-full justify-evenly"
  >
    <li>
      <ActivityTrend
        classification="organic"
        label="Organic"
        :trend="categoryProgression?.organic.trend"
        :percentage="stats?.organic.percentage"
      />
    </li>
    <li>
      <ActivityTrend
        classification="mixed"
        label="Mixed"
        :trend="categoryProgression?.mixed.trend"
        :percentage="stats?.mixed.percentage"
      />
    </li>
    <li>
      <ActivityTrend
        classification="automation"
        label="Automation"
        :trend="categoryProgression?.automation.trend"
        :percentage="stats?.automation.percentage"
      />
    </li>
  </ul>
</template>
