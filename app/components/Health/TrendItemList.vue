<script setup lang="ts">
import type { EcosystemHealthCategory } from '~~/shared/types/ecosystem-health'

const props = withDefaults(
  defineProps<{
    view?: string
  }>(),
  {
    view: 'daily',
  },
)

type ClassificationStats = Record<
  EcosystemHealthCategory,
  { count: number; percentage: string }
>

const { data: ecosystemHealthDaily } = await useEcosystemHealth()
const { data: ecosystemHealthHourly } = await useEcosystemHealthHourlyWindow()

const entriesDaily = computed(() => ecosystemHealthDaily.value?.entries ?? [])
const entriesHourly = computed(() => ecosystemHealthHourly.value?.entries ?? [])

const categoryProgression = computed(() => {
  return props.view === 'daily'
    ? ecosystemHealthDaily.value?.categoryProgression
    : ecosystemHealthHourly.value?.categoryProgression
})

const latestDayStats = computed<ClassificationStats | null>(() => {
  return props.view === 'daily'
    ? getHealthStatsFromEntries(entriesDaily.value)
    : getHealthStatsFromEntries(entriesHourly.value)
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
        :percentage="latestDayStats?.organic.percentage"
      />
    </li>
    <li>
      <HealthTrend
        classification="mixed"
        label="Mixed"
        :trend="categoryProgression?.mixed.trend"
        :percentage="latestDayStats?.mixed.percentage"
      />
    </li>
    <li>
      <HealthTrend
        classification="automation"
        label="Automation"
        :trend="categoryProgression?.automation.trend"
        :percentage="latestDayStats?.automation.percentage"
      />
    </li>
  </ul>
</template>
