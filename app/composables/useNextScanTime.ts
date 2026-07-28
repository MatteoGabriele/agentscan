import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'

dayjs.extend(utc)

// Replica of the cron schedules in .github/workflows/scan-users.yml, which
// rotate on a 7-day cycle keyed off the day of the month.
const workflowScheduler = [
  { hour: 0, minute: 0 },
  { hour: 3, minute: 26 },
  { hour: 6, minute: 51 },
  { hour: 10, minute: 17 },
  { hour: 13, minute: 43 },
  { hour: 17, minute: 9 },
  { hour: 20, minute: 34 },
]

function scanTimeOn(date: Dayjs): Dayjs | undefined {
  const dateIndex: number = (date.date() - 1) % 7
  const currentSchedule = workflowScheduler[dateIndex]

  if (!currentSchedule) {
    return
  }

  const { hour, minute } = currentSchedule
  return date.hour(hour).minute(minute).second(0).millisecond(0)
}

type UseNextScanTimeReturn = {
  nextScanTime: ComputedRef<string | undefined>
}

export function useNextScanTime(): UseNextScanTimeReturn {
  const nextScanTime = computed<string | undefined>(() => {
    const now = dayjs.utc()
    const today = scanTimeOn(now)

    if (!today) {
      return
    }

    const nextScan = today.isAfter(now) ? today : scanTimeOn(now.add(1, 'day'))

    const local = nextScan?.local()

    if (!local) {
      return
    }

    const day = local.isSame(dayjs(), 'day') ? 'today' : 'tomorrow'

    return `Next scan ${day} at ${local.format('HH:mm')}`
  })

  return {
    nextScanTime,
  }
}
