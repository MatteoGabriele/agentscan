import { subtractMonths } from './dates'

export const WINDOW_MAX_HOURS = 25

export const DEFAULT_HISTORY_MONTHS = 2

export function getHistoryRangeStart(latestTimestamp: string): string {
  return subtractMonths({
    date: latestTimestamp,
    months: DEFAULT_HISTORY_MONTHS,
  })
}
