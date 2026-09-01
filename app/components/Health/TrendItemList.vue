<script setup lang="ts">
import type { EcosystemHealthCategory } from '~~/shared/types/ecosystem-health'

type ClassificationStats = Record<
  EcosystemHealthCategory,
  { count: number; percentage: string }
>

const { view = 'daily' } = defineProps<{
  view?: 'daily' | 'hourly'
}>()

const isHourly = computed(() => view === 'hourly')

const { data: ecosystemHealth } = await useEcosystemHealth()
const { data: hourlyWindow, execute: loadHourlyWindow } =
  useEcosystemHealthHourlyWindow({ immediate: false })

watch(
  isHourly,
  (hourly) => {
    if (hourly) {
      loadHourlyWindow()
    }
  },
  { immediate: true },
)

const entries = computed(() => ecosystemHealth.value?.entries ?? [])

const categoryProgression = computed(() => {
  return isHourly.value
    ? hourlyWindow.value?.categoryProgression
    : ecosystemHealth.value?.categoryProgression
})

const stats = computed<ClassificationStats | null>(() => {
  if (isHourly.value) {
    // Totals over the whole scan window the hourly chart plots, not the last scan
    return getHealthStatsByBuckets(
      hourlyWindow.value?.countsByScanTime,
      hourlyWindow.value?.scanTimes,
    )
  }

  return getDailyHealthStats(entries.value)
})
</script>

<template>
  <ul
    class="text-center flex flex-col md:flex-row gap-2 items-center md:text-left w-full justify-evenly"
  >
    <li>
      <HealthTrend
        classification="organic"
        label="Organic"
        :trend="categoryProgression?.organic.trend"
        :percentage="stats?.organic.percentage"
      />
    </li>
    <li>
      <HealthTrend
        classification="mixed"
        label="Mixed"
        :trend="categoryProgression?.mixed.trend"
        :percentage="stats?.mixed.percentage"
      />
    </li>
    <li>
      <HealthTrend
        classification="automation"
        label="Automation"
        :trend="categoryProgression?.automation.trend"
        :percentage="stats?.automation.percentage"
      />
    </li>
  </ul>
</template>
