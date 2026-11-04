import type { ActivityCategory } from '../types/activity'
import type { ActivityDailyResponse } from '../types/logs-api'
import { CLASSIFICATION_CATEGORIES } from './count-classification-by-date'
import { round } from './numbers'

export const ACTIVITY_WEEK_DAYS = 7

type CategoryValues<T> = Record<ActivityCategory, T>

export type ActivityWeekSnapshot = {
  // Days of the week, oldest first. Usually consecutive, but a day with no
  // scans at all is missing from the rollup.
  dates: string[]
  // Pull requests scored across the week
  total: number
  // Share of the week's pull requests, in percent
  shares: CategoryValues<number>
  // Percentage points gained or lost against the previous week, null when
  // there is no previous week to compare against
  changes: CategoryValues<number | null>
  // Daily share, in percent, one value per day of the week
  series: CategoryValues<number[]>
}

function sumCounts(
  countsByDate: ActivityDailyResponse['countsByDate'],
  dates: string[],
) {
  const counts: CategoryValues<number> = {
    organic: 0,
    mixed: 0,
    automation: 0,
  }

  dates.forEach((date) => {
    CLASSIFICATION_CATEGORIES.forEach((category) => {
      counts[category] += countsByDate[date]?.[category].count ?? 0
    })
  })

  const total = CLASSIFICATION_CATEGORIES.reduce((sum, category) => {
    return sum + counts[category]
  }, 0)

  return {
    counts,
    total,
  }
}

function toShare(count: number, total: number) {
  return total === 0 ? 0 : (count / total) * 100
}

export function getActivityWeekSnapshot({
  dates,
  countsByDate,
}: Pick<
  ActivityDailyResponse,
  'dates' | 'countsByDate'
>): ActivityWeekSnapshot | null {
  const weekDates = dates.slice(-ACTIVITY_WEEK_DAYS)
  const previousDates = dates.slice(
    -ACTIVITY_WEEK_DAYS * 2,
    -ACTIVITY_WEEK_DAYS,
  )

  const week = sumCounts(countsByDate, weekDates)

  if (week.total === 0) {
    return null
  }

  const previous = sumCounts(countsByDate, previousDates)

  const shares = {} as CategoryValues<number>
  const changes = {} as CategoryValues<number | null>
  const series = {} as CategoryValues<number[]>

  CLASSIFICATION_CATEGORIES.forEach((category) => {
    const share = toShare(week.counts[category], week.total)

    shares[category] = round(share, 1)

    if (previous.total === 0) {
      changes[category] = null
    } else {
      changes[category] = round(
        share - toShare(previous.counts[category], previous.total),
        1,
      )
    }

    series[category] = weekDates.map((date) => {
      return round(countsByDate[date]?.[category].percentage ?? 0, 1)
    })
  })

  return {
    dates: weekDates,
    total: week.total,
    shares,
    changes,
    series,
  }
}
