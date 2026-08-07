<script setup lang="ts">
import { computed, watch } from 'vue'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type {
  TimezoneId,
  WorkHours,
  TimezoneWorkHours,
  CompleteTimezoneWorkHours,
} from '~~/shared/types/tz-work-hours'

dayjs.extend(utc)

interface TimezoneOption {
  id: TimezoneId
  label: string
  examples: string
  offsetMinutes: number
}

const TIMEZONES = [
  {
    id: 'UTC-12:00',
    label: 'International Date Line West',
    examples: 'Baker Island',
    offsetMinutes: -12 * 60,
  },
  {
    id: 'UTC-11:00',
    label: 'Samoa',
    examples: 'American Samoa',
    offsetMinutes: -11 * 60,
  },
  {
    id: 'UTC-10:00',
    label: 'Hawaii',
    examples: 'Honolulu',
    offsetMinutes: -10 * 60,
  },
  {
    id: 'UTC-09:00',
    label: 'Alaska',
    examples: 'Anchorage',
    offsetMinutes: -9 * 60,
  },
  {
    id: 'UTC-08:00',
    label: 'Pacific',
    examples: 'Los Angeles, Vancouver',
    offsetMinutes: -8 * 60,
  },
  {
    id: 'UTC-07:00',
    label: 'Mountain',
    examples: 'Denver, Phoenix',
    offsetMinutes: -7 * 60,
  },
  {
    id: 'UTC-06:00',
    label: 'Central',
    examples: 'Chicago, Mexico City',
    offsetMinutes: -6 * 60,
  },
  {
    id: 'UTC-05:00',
    label: 'Eastern',
    examples: 'New York, Toronto',
    offsetMinutes: -5 * 60,
  },
  {
    id: 'UTC-04:00',
    label: 'Atlantic',
    examples: 'Halifax, Caribbean',
    offsetMinutes: -4 * 60,
  },
  {
    id: 'UTC-03:00',
    label: 'Brasília / Argentina',
    examples: 'São Paulo, Buenos Aires',
    offsetMinutes: -3 * 60,
  },
  {
    id: 'UTC-02:00',
    label: 'South Georgia',
    examples: 'South Georgia Islands',
    offsetMinutes: -2 * 60,
  },
  {
    id: 'UTC-01:00',
    label: 'Azores / Cape Verde',
    examples: 'Azores, Praia',
    offsetMinutes: -1 * 60,
  },
  {
    id: 'UTC+00:00',
    label: 'Greenwich Mean Time',
    examples: 'London, Dublin, Accra',
    offsetMinutes: 0,
  },
  {
    id: 'UTC+01:00',
    label: 'Central European',
    examples: 'Paris, Berlin, Oslo',
    offsetMinutes: 1 * 60,
  },
  {
    id: 'UTC+02:00',
    label: 'Eastern European',
    examples: 'Athens, Helsinki, Cairo',
    offsetMinutes: 2 * 60,
  },
  {
    id: 'UTC+03:00',
    label: 'Moscow / East Africa',
    examples: 'Moscow, Nairobi',
    offsetMinutes: 3 * 60,
  },
  {
    id: 'UTC+04:00',
    label: 'Gulf',
    examples: 'Dubai, Abu Dhabi',
    offsetMinutes: 4 * 60,
  },
  {
    id: 'UTC+05:00',
    label: 'Pakistan',
    examples: 'Karachi, Tashkent',
    offsetMinutes: 5 * 60,
  },
  {
    id: 'UTC+06:00',
    label: 'Bangladesh',
    examples: 'Dhaka, Almaty',
    offsetMinutes: 6 * 60,
  },
  {
    id: 'UTC+07:00',
    label: 'Indochina',
    examples: 'Bangkok, Jakarta',
    offsetMinutes: 7 * 60,
  },
  {
    id: 'UTC+08:00',
    label: 'China / Singapore',
    examples: 'Beijing, Singapore',
    offsetMinutes: 8 * 60,
  },
  {
    id: 'UTC+09:00',
    label: 'Japan / Korea',
    examples: 'Tokyo, Seoul',
    offsetMinutes: 9 * 60,
  },
  {
    id: 'UTC+10:00',
    label: 'Australian Eastern',
    examples: 'Brisbane, Sydney',
    offsetMinutes: 10 * 60,
  },
  {
    id: 'UTC+11:00',
    label: 'Solomon Islands',
    examples: 'Nouméa, Honiara',
    offsetMinutes: 11 * 60,
  },
] as const satisfies readonly TimezoneOption[]

const DEFAULT_WORK_HOURS: WorkHours = {
  start: '07:00',
  end: '23:00',
}

const model = defineModel<TimezoneWorkHours>()
const selectedTimezoneId = defineModel<TimezoneId>('timezone', {
  default: 'UTC+00:00',
})

const timeOptions = Array.from({ length: 24 }, (_, hour) => {
  const value = dayjs.utc().startOf('day').hour(hour).format('HH:mm')

  return {
    value,
    label: value,
  }
})

const selectedWorkHours = computed<WorkHours>(() => {
  return (
    model.value?.[selectedTimezoneId.value] ?? {
      ...DEFAULT_WORK_HOURS,
    }
  )
})

const selectedStart = computed({
  get(): string {
    return selectedWorkHours.value.start
  },

  set(value: string): void {
    updateWorkHour('start', value)
  },
})

const selectedEnd = computed({
  get(): string {
    return selectedWorkHours.value.end
  },

  set(value: string): void {
    updateWorkHour('end', value)
  },
})

function isValidTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    timeOptions.some((option) => option.value === value)
  )
}

function normalizeModel(
  value: TimezoneWorkHours = {},
): CompleteTimezoneWorkHours {
  return Object.fromEntries(
    TIMEZONES.map((timezone) => {
      const currentValue = value[timezone.id]

      return [
        timezone.id,
        {
          start: isValidTime(currentValue?.start)
            ? currentValue.start
            : DEFAULT_WORK_HOURS.start,
          end: isValidTime(currentValue?.end)
            ? currentValue.end
            : DEFAULT_WORK_HOURS.end,
        },
      ]
    }),
  ) as CompleteTimezoneWorkHours
}

function needsNormalization(value?: Partial<TimezoneWorkHours>): boolean {
  if (!value) {
    return true
  }

  return TIMEZONES.some((timezone) => {
    const hours = value[timezone.id]

    return !isValidTime(hours?.start) || !isValidTime(hours?.end)
  })
}

function updateWorkHour(field: keyof WorkHours, value: string): void {
  if (!isValidTime(value)) {
    return
  }
  const currentModel = normalizeModel(model.value)
  const timezoneId = selectedTimezoneId.value

  model.value = {
    ...currentModel,
    [timezoneId]: {
      ...currentModel[timezoneId],
      [field]: value,
    },
  }
}

function formatOffset(offsetMinutes: number): string {
  const offset = dayjs.utc().utcOffset(offsetMinutes).format('Z')

  return offset === '+00:00' ? 'UTC±00:00' : `UTC${offset}`
}

watch(
  model,
  (value) => {
    if (needsNormalization(value)) {
      model.value = normalizeModel(value)
    }
  },
  {
    immediate: true,
    deep: true,
  },
)

watch(
  selectedTimezoneId,
  (timezoneId, previousTimezoneId) => {
    if (!previousTimezoneId || timezoneId === previousTimezoneId) {
      return
    }

    const currentModel = normalizeModel(model.value)
    const previousHours = currentModel[previousTimezoneId]
    const targetHours = model.value?.[timezoneId]

    if (targetHours) {
      return
    }

    model.value = {
      ...currentModel,
      [timezoneId]: { ...previousHours },
    }
  },
  { flush: 'sync' },
)
</script>

<template>
  <section class="w-full" aria-label="Work hours by timezone">
    <div class="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
      <label
        class="flex min-w-0 w-full flex-col gap-1 lg:w-[calc(50%_-_0.3125rem)]"
      >
        <span
          class="text-[11px] font-medium uppercase tracking-wide text-gh-muted"
        >
          Timezone
        </span>

        <select
          v-model="selectedTimezoneId"
          class="min-w-0 w-full rounded-md border border-current/20 bg-transparent px-2.5 py-1.5 text-sm text-inherit outline-none transition-colors hover:border-current/30 focus:border-current/40 focus:ring-2 focus:ring-current/10"
        >
          <option
            v-for="timezone in TIMEZONES"
            :key="timezone.id"
            :value="timezone.id"
          >
            {{ formatOffset(timezone.offsetMinutes) }}
            - {{ timezone.label }}
          </option>
        </select>
      </label>

      <label
        class="flex min-w-0 w-full flex-col gap-1 sm:w-[calc(50%_-_0.3125rem)] lg:w-[calc(25%_-_0.46875rem)]"
      >
        <span
          class="text-[11px] font-medium uppercase tracking-wide text-gh-muted"
        >
          Sleep starts
        </span>

        <select
          v-model="selectedEnd"
          class="min-w-0 w-full rounded-md border border-current/20 bg-transparent px-2.5 py-1.5 text-sm tabular-nums text-inherit outline-none transition-colors hover:border-current/30 focus:border-current/40 focus:ring-2 focus:ring-current/10"
        >
          <option
            v-for="time in timeOptions"
            :key="time.value"
            :value="time.value"
          >
            {{ time.label }}
          </option>
        </select>
      </label>

      <label
        class="flex min-w-0 w-full flex-col gap-1 sm:w-[calc(50%_-_0.3125rem)] lg:w-[calc(25%_-_0.46875rem)]"
      >
        <span
          class="text-[11px] font-medium uppercase tracking-wide text-gh-muted"
        >
          Sleep ends
        </span>

        <select
          v-model="selectedStart"
          class="min-w-0 w-full rounded-md border border-current/20 bg-transparent px-2.5 py-1.5 text-sm tabular-nums text-inherit outline-none transition-colors hover:border-current/30 focus:border-current/40 focus:ring-2 focus:ring-current/10"
        >
          <option
            v-for="time in timeOptions"
            :key="time.value"
            :value="time.value"
          >
            {{ time.label }}
          </option>
        </select>
      </label>
    </div>
  </section>
</template>
