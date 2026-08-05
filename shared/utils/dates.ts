import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

export function subtractMonths({
  date,
  months,
}: {
  date: string
  months: number
}): string {
  const source = dayjs.utc(date)

  if (!source.isValid()) {
    return ''
  }

  return source.subtract(months, 'month').startOf('day').toISOString()
}

export function formatDateRange({
  startDate,
  endDate,
  startYear = false,
  endYear = true,
  locale = 'en-GB',
}: {
  startDate: string | undefined
  endDate: string | undefined
  startYear?: boolean
  endYear?: boolean
  locale?: string
}): string {
  if (!startDate || !endDate) {
    return ''
  }

  const start = new Date(startDate)
  const end = new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return ''
  }

  const startLabel = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    year: startYear ? 'numeric' : undefined,
  }).format(start)

  const endLabel = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: endYear ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(end)

  return `${startLabel} - ${endLabel}`
}

export function roundToClosestHour(timestamp: string): string {
  const date = dayjs(timestamp)
  if (!date.isValid()) {
    return timestamp
  }
  return date.utc().add(30, 'minute').startOf('hour').toISOString()
}
