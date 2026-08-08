import { subtractMonths } from './dates'

export const DEFAULT_HISTORY_MONTHS = 2

export function getHistoryRangeStart(latestTimestamp: string): string {
  return subtractMonths({
    date: latestTimestamp,
    months: DEFAULT_HISTORY_MONTHS,
  })
}
