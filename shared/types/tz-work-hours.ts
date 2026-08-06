export const TIMEZONE_IDS = [
  'UTC-12:00',
  'UTC-11:00',
  'UTC-10:00',
  'UTC-09:00',
  'UTC-08:00',
  'UTC-07:00',
  'UTC-06:00',
  'UTC-05:00',
  'UTC-04:00',
  'UTC-03:00',
  'UTC-02:00',
  'UTC-01:00',
  'UTC+00:00',
  'UTC+01:00',
  'UTC+02:00',
  'UTC+03:00',
  'UTC+04:00',
  'UTC+05:00',
  'UTC+06:00',
  'UTC+07:00',
  'UTC+08:00',
  'UTC+09:00',
  'UTC+10:00',
  'UTC+11:00',
] as const

export type TimezoneId = (typeof TIMEZONE_IDS)[number]

export type WorkHours = {
  start: string
  end: string
}

export type TimezoneWorkHours = Partial<Record<TimezoneId, WorkHours>>

export type CompleteTimezoneWorkHours = Record<TimezoneId, WorkHours>
