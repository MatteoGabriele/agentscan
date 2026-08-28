import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const SCAN_LANDS_AT_MINUTE = 10

export function currentScanWindow(period: 'hour' | 'day'): string {
  const landed = dayjs().utc().subtract(SCAN_LANDS_AT_MINUTE, 'minute')

  return landed.format(period === 'hour' ? 'YYYY-MM-DD[T]HH' : 'YYYY-MM-DD')
}
