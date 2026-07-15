<script setup lang="ts">
import type { IdentityClassification } from '@unveil/identity'

type ClassificationStats = Record<
  IdentityClassification,
  { count: number; percentage: string }
>

const { data: ecosystemHealth } = await useEcosystemHealth()

const categoryProgression = computed(() => {
  return ecosystemHealth.value?.categoryProgression
})

const latestWeekStats = computed<ClassificationStats | null>(() => {
  const dates = ecosystemHealth.value?.dates
  const lastDate = dates?.at(-1)
  const counts = lastDate
    ? ecosystemHealth.value?.countsByDate?.[lastDate]
    : undefined

  if (!counts) {
    return null
  }

  return {
    organic: {
      count: counts.organic.count,
      percentage: formatPercentage(counts.organic.percentage),
    },
    mixed: {
      count: counts.mixed.count,
      percentage: formatPercentage(counts.mixed.percentage),
    },
    automation: {
      count: counts.automation.count,
      percentage: formatPercentage(counts.automation.percentage),
    },
  }
})

const percentageClosureRate = computed<string | undefined>(() => {
  const weeks = ecosystemHealth.value?.weeks ?? []

  const eligiblePrs = weeks.reduce(
    (sum, week) => sum + week.automationClosure.eligiblePrs,
    0,
  )
  const closedPrs = weeks.reduce(
    (sum, week) => sum + week.automationClosure.closedPrs,
    0,
  )

  if (!weeks.length) {
    return undefined
  }

  const percentage =
    eligiblePrs === 0 ? 100 : Math.round((closedPrs / eligiblePrs) * 100)

  return percentage.toString()
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
        :percentage="latestWeekStats?.organic.percentage"
      />
    </li>
    <li>
      <HealthTrend
        classification="mixed"
        label="Mixed"
        :trend="categoryProgression?.mixed.trend"
        :percentage="latestWeekStats?.mixed.percentage"
      />
    </li>
    <li>
      <HealthTrend
        classification="automation"
        label="Automation"
        :trend="categoryProgression?.automation.trend"
        :percentage="latestWeekStats?.automation.percentage"
      />
    </li>
  </ul>

  <HealthTrend
    class="mt-2 md:mt-4"
    label="Automation PR closure rate"
    :percentage="percentageClosureRate"
  />
</template>
