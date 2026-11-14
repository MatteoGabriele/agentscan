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

export function getCompleteDayRange(days: string[]): string[] {
  const firstDay = days[0]
  const lastDay = days.at(-1)

  if (!firstDay || !lastDay) {
    return []
  }

  const firstDayTime = new Date(firstDay).getTime()
  const lastDayTime = new Date(lastDay).getTime()
  const oneDay = 24 * 60 * 60 * 1000
  const completeDays: string[] = []

  for (let time = firstDayTime; time <= lastDayTime; time += oneDay) {
    completeDays.push(new Date(time).toISOString().slice(0, 10))
  }

  return completeDays
}

export function getDayKey(date: string | Date) {
  if (typeof date === 'string') {
    return date.slice(0, 10)
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}
