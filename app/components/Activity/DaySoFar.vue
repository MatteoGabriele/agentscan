<script setup lang="ts">
import type { ActivityUnit } from '~~/shared/types/activity'
import { formatCompactNumber } from '~~/shared/utils/numbers'
import {
  CLASSIFICATION_CATEGORIES,
  CLASSIFICATION_NAMES,
} from '~~/shared/utils/classifications'

const { unit = 'percentage' } = defineProps<{ unit?: ActivityUnit }>()

const MIN_HOURS = 6
const MIN_PRS = 50
const ESTIMATE_MIN_HOURS = 12

const { data: activity } = useActivity()
const { data: hourlyWindow } = useActivityHourlyWindow({ immediate: false })

function getTotal(stats: ReturnType<typeof getActivityStatsByBuckets>) {
  return CLASSIFICATION_CATEGORIES.reduce(
    (sum, category) => sum + (stats?.[category].count ?? 0),
    0,
  )
}

function isWeekend(date: string) {
  return [0, 6].includes(new Date(`${date}T00:00:00.000Z`).getUTCDay())
}

function formatEstimate(estimate: number | null) {
  if (estimate === null) {
    return undefined
  }

  const roundedToTens = Math.round(estimate / 10) * 10
  return formatCompactNumber(roundedToTens)
}

function getDayTypeNote(previousDate: string, date: string) {
  const wasWeekend = isWeekend(previousDate)

  if (wasWeekend === isWeekend(date)) {
    return undefined
  }

  const dayType = wasWeekend ? 'weekend day' : 'weekday'
  return `(yesterday was a ${dayType})`
}

// estimate = today so far * yesterday total / yesterday so far
const daySoFar = computed(() => {
  const countsByScanTime = hourlyWindow.value?.countsByScanTime
  const buckets = getDaySoFarBuckets(hourlyWindow.value?.scanTimes ?? [])

  if (!buckets) {
    return null
  }

  const today = getActivityStatsByBuckets(countsByScanTime, buckets.today)
  const yesterday = getActivityStatsByBuckets(activity.value?.countsByDate, [
    buckets.previousDate,
  ])
  const remaining = getActivityStatsByBuckets(
    countsByScanTime,
    buckets.remaining,
  )

  const hours = buckets.today.length
  const total = getTotal(today)
  const previousTotal = getTotal(yesterday)

  const hasEnoughData = hours >= MIN_HOURS && total >= MIN_PRS
  const canEstimate = Boolean(yesterday) && hours >= ESTIMATE_MIN_HOURS

  let estimate: number | null = null
  if (canEstimate) {
    estimate = estimateDayTotal({
      soFar: total,
      remaining: getTotal(remaining),
      previousTotal,
    })
  }

  let dayTypeNote: string | undefined
  if (yesterday) {
    dayTypeNote = getDayTypeNote(buckets.previousDate, buckets.date)
  }

  return {
    hours,
    today: hasEnoughData ? today : null,
    yesterday,
    total: formatCompactNumber(total),
    previousTotal: formatCompactNumber(previousTotal),
    estimate: formatEstimate(estimate),
    dayTypeNote,
  }
})
</script>

<template>
  <Skeleton
    v-if="!daySoFar"
    class="mx-auto my-0.5 max-w-full"
    width="w-[320px]"
    height="h-[12px]"
    rounded="full"
  />
  <p v-else class="text-xs text-ui-muted text-center text-pretty">
    Today so far ({{ daySoFar.hours }} of 24 hours, UTC)<template
      v-if="daySoFar.today"
      >:
      <template v-if="unit === 'quantity'">
        {{ daySoFar.total }} PRs
        <template v-if="daySoFar.yesterday">
          · yesterday {{ daySoFar.previousTotal }}
        </template>
        <span
          v-if="daySoFar.estimate"
          title="Estimate: today so far, scaled by how much of yesterday's total had arrived by this hour (UTC)."
        >
          · about {{ daySoFar.estimate }} expected by end of day
        </span>
      </template>
      <template v-else>
        {{ daySoFar.today.automation.percentage }}%
        {{ CLASSIFICATION_NAMES.automation.toLowerCase() }}
        <template v-if="daySoFar.yesterday">
          · yesterday {{ daySoFar.yesterday.automation.percentage }}%
        </template>
      </template>
      {{ daySoFar.dayTypeNote }}
    </template>
  </p>
</template>
