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
  const now = ref(dayjs.utc())
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const nextScan = computed<Dayjs | undefined>(() => {
    const today = scanTimeOn(now.value)

    if (!today) {
      return
    }

    return today.isAfter(now.value)
      ? today
      : scanTimeOn(now.value.add(1, 'day'))
  })

  const nextScanTime = computed<string | undefined>(() => {
    const local = nextScan.value?.local()

    if (!local) {
      return
    }

    const day = local.isSame(now.value.local(), 'day') ? 'today' : 'tomorrow'

    return `Next scan ${day} at ${local.format('HH:mm')}`
  })

  function scheduleRefresh() {
    const target = nextScan.value

    if (!target) {
      return
    }

    timeoutId = setTimeout(
      () => {
        now.value = dayjs.utc()
        scheduleRefresh()
      },
      Math.max(target.diff(dayjs.utc()) + 1000, 1000),
    )
  }

  onMounted(scheduleRefresh)

  onBeforeUnmount(() => {
    clearTimeout(timeoutId)
  })

  return {
    nextScanTime,
  }
}
