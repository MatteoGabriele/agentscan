import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// Replica of the cron schedules in .github/workflows/scan-users.yml
const SCAN_SCHEDULE: Record<number, { hour: number; minute: number }> = {
  1: { hour: 0, minute: 0 },
  2: { hour: 3, minute: 26 },
  3: { hour: 6, minute: 51 },
  4: { hour: 10, minute: 17 },
  5: { hour: 13, minute: 43 },
  6: { hour: 17, minute: 9 },
  7: { hour: 20, minute: 34 },
  8: { hour: 0, minute: 0 },
  9: { hour: 3, minute: 26 },
  10: { hour: 6, minute: 51 },
  11: { hour: 10, minute: 17 },
  12: { hour: 13, minute: 43 },
  13: { hour: 17, minute: 9 },
  14: { hour: 20, minute: 34 },
  15: { hour: 0, minute: 0 },
  16: { hour: 3, minute: 26 },
  17: { hour: 6, minute: 51 },
  18: { hour: 10, minute: 17 },
  19: { hour: 13, minute: 43 },
  20: { hour: 17, minute: 9 },
  21: { hour: 20, minute: 34 },
  22: { hour: 0, minute: 0 },
  23: { hour: 3, minute: 26 },
  24: { hour: 6, minute: 51 },
  25: { hour: 10, minute: 17 },
  26: { hour: 13, minute: 43 },
  27: { hour: 17, minute: 9 },
  28: { hour: 20, minute: 34 },
  29: { hour: 0, minute: 0 },
  30: { hour: 3, minute: 26 },
  31: { hour: 6, minute: 51 },
};

function getNextScanTime(currentDate: Date = new Date()): Date {
  const now = dayjs.utc(currentDate);
  const currentDay = now.date();

  const todaySchedule = SCAN_SCHEDULE[currentDay];
  if (todaySchedule) {
    const scanTimeToday = now
      .hour(todaySchedule.hour)
      .minute(todaySchedule.minute)
      .second(0)
      .millisecond(0);

    if (scanTimeToday.isAfter(now)) {
      return scanTimeToday.toDate();
    }
  }

  let nextDay = currentDay + 1;
  let nextDate = now.add(1, "day");

  const daysInMonth = nextDate.daysInMonth();

  if (nextDay > daysInMonth) {
    nextDay = 1;
    nextDate = nextDate.add(1, "month").date(1);
  } else {
    nextDate = nextDate.date(nextDay);
  }

  const nextSchedule = SCAN_SCHEDULE[nextDay]!;
  const nextScanDate = nextDate
    .hour(nextSchedule.hour)
    .minute(nextSchedule.minute)
    .second(0)
    .millisecond(0);

  return nextScanDate.toDate();
}

function formatNextScanTime(nextScanDate: Date): string {
  const now = dayjs.utc();
  const scanTime = dayjs.utc(nextScanDate);

  const diffMs = scanTime.diff(now);

  if (diffMs < 0) {
    return "Scan in progress";
  }

  const diffDays = scanTime.diff(now, "day");
  const diffHours = scanTime.diff(now, "hour");
  const diffMinutes = scanTime.diff(now, "minute");

  if (diffHours === 0) {
    return `Next scan in ${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  }

  if (diffDays === 0) {
    const remainingMinutes = diffMinutes % 60;
    return `Next scan in ${diffHours} hour${diffHours !== 1 ? "s" : ""} and ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`;
  }

  const scanTimeUtc = scanTime.format("HH:mm");
  return `Next scan in ${diffDays} day${diffDays !== 1 ? "s" : ""} at ${scanTimeUtc} UTC`;
}

export function useNextScanTime() {
  const now = ref(new Date());
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const nextScanTime = computed(() => {
    return getNextScanTime(now.value);
  });

  const formattedNextScanTime = computed(() => {
    return formatNextScanTime(nextScanTime.value);
  });

  onMounted(() => {
    // Update every minute to keep the display fresh
    intervalId = setInterval(() => {
      now.value = new Date();
    }, 60000);
  });

  onBeforeUnmount(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  return {
    nextScanTime,
    formattedNextScanTime,
  };
}
