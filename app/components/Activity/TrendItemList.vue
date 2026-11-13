<script setup lang="ts">
import type { ActivityCategory, ActivityUnit } from '~~/shared/types/activity'
import { calcLinearProgression } from '~~/shared/utils/calc-linear-progression'

type ClassificationStats = Record<
  ActivityCategory,
  { count: number; percentage: string }
>

const { view = 'daily', unit = 'percentage' } = defineProps<{
  view?: 'daily' | 'hourly'
  unit?: ActivityUnit
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
  if (unit === 'quantity') {
    const buckets = isHourly.value
      ? hourlyWindow.value?.scanTimes
      : activity.value?.dates
    const counts = isHourly.value
      ? hourlyWindow.value?.countsByScanTime
      : activity.value?.countsByDate

    if (!buckets || !counts) {
      return undefined
    }

    const progression = (category: ActivityCategory) =>
      calcLinearProgression(
        buckets.map((bucket) => counts[bucket]?.[category].count ?? 0),
      )

    return {
      organic: progression('organic'),
      mixed: progression('mixed'),
      automation: progression('automation'),
    }
  }

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
    <li
      v-for="{ name, category } in CLASSIFICATIONS_WITH_NAME_AND_CATEGORY"
      :key="category"
    >
      <ActivityTrend
        :classification="category"
        :label="name"
        :trend="categoryProgression?.[category].trend"
        :percentage="stats?.[category].percentage"
        :count="stats?.[category].count"
        :unit
      />
    </li>
  </ul>
</template>
