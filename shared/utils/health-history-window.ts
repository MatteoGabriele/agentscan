import { subtractMonths } from './dates'
import type { DailyScanEntry } from './daily-rollup'

export const WINDOW_MAX_HOURS = 25

export const DEFAULT_HISTORY_MONTHS = 2

export function getHistoryRangeStart(latestTimestamp: string): string {
  return subtractMonths({
    date: latestTimestamp,
    months: DEFAULT_HISTORY_MONTHS,
  })
}

export function getRecentDailyEntries(
  entries: DailyScanEntry[],
): DailyScanEntry[] {
  const latestDate = entries.reduce(
    (latest, entry) => (entry.date > latest ? entry.date : latest),
    '',
  )

  if (!latestDate) {
    return entries
  }

  const rangeStart = getHistoryRangeStart(latestDate).slice(0, 10)

  return entries.filter((entry) => entry.date >= rangeStart)
}
