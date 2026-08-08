<script setup lang="ts">
import { getDailyHealthStats } from '~~/shared/utils/daily-rollup'

// Mirror of `HealthTrendItemList` fed by the stored daily rollup. Both describe
// the whole window they are given — the live one by summing raw rows, this one
// by summing the day counts those rows were folded into.
const { data: dailyHealth } = await useEcosystemHealthDaily()

const categoryProgression = computed(
  () => dailyHealth.value?.categoryProgression,
)

const windowStats = computed(() => {
  return getDailyHealthStats(dailyHealth.value?.entries ?? [])
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
        :percentage="windowStats?.organic.percentage"
      />
    </li>
    <li>
      <HealthTrend
        classification="mixed"
        label="Mixed"
        :trend="categoryProgression?.mixed.trend"
        :percentage="windowStats?.mixed.percentage"
      />
    </li>
    <li>
      <HealthTrend
        classification="automation"
        label="Automation"
        :trend="categoryProgression?.automation.trend"
        :percentage="windowStats?.automation.percentage"
      />
    </li>
  </ul>
</template>
