<script setup lang="ts">
import type { IdentityClassification } from '@unveil/identity'

type ClassificationStats = Record<
  IdentityClassification,
  { count: number; percentage: string }
>

const { data: ecosystemHealth } = await useEcosystemHealth()
const data = computed(() => ecosystemHealth.value?.results)

const categoryProgression = computed(() => {
  return ecosystemHealth.value?.categoryProgression
})

const latestDayStats = computed<ClassificationStats | null>(() => {
  return getHealthStats(data.value)
})

const percentageClosureRate = computed<string | undefined>(() => {
  return getClosedPrPercentageTotal(data.value, [0, 50])?.toString()
})
</script>

<template>
  <ul
    class="text-center flex flex-col md:flex-row gap-2 items-center md:text-left w-full justify-evenly px-4 md:py-4 md:border-y md:border-y-gh-border/40"
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

  <HealthTrend
    class="mt-2 md:mt-4"
    label="Automation PR closure rate"
    :percentage="percentageClosureRate"
  />
</template>
