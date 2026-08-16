<script setup lang="ts">
import type { EcosystemHealthCategory } from '~~/shared/types/ecosystem-health'

type ClassificationStats = Record<
  EcosystemHealthCategory,
  { count: number; percentage: string }
>

const { data: ecosystemHealth } = await useEcosystemHealth()
const entries = computed(() => ecosystemHealth.value?.entries ?? [])

const categoryProgression = computed(() => {
  return ecosystemHealth.value?.categoryProgression
})

const latestDayStats = computed<ClassificationStats | null>(() => {
  return getHealthStatsFromEntries(entries.value)
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
