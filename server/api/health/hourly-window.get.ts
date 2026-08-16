import { unpack } from '~~/shared/utils/compactor'
import type { ScanEntry } from '~~/shared/utils/daily-rollup'
import {
  applyCumulativeTrends,
  fillEmptyHourlyBuckets,
  getClassificationStatsByScanTime,
} from '~~/shared/utils/count-classification-by-date'
import { WINDOW_MAX_HOURS } from '~~/shared/utils/health-history-window'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage('assets:data').getItemRaw(
      'hourly-window-scan-results.txt',
    )

    if (!raw) {
      throw new Error('hourly-window-scan-results.txt not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)

    const results = unpack(content).map((entry) => ({
      ...entry,
      created_at: roundToClosestHour(entry.created_at),
    }))

    // An hour with no PR opened writes no row at all, so it has to be
    // added as an empty bucket instead of being skipped by the chart.
    const countsByScanTime = fillEmptyHourlyBuckets({
      countsByHour: getClassificationStatsByScanTime(results),
      maxHours: WINDOW_MAX_HOURS,
    })
    const categoryProgression = applyCumulativeTrends(countsByScanTime)
    const scanTimes = Object.keys(countsByScanTime).sort()

    const entries = Object.values(countsByScanTime).map((entry) => ({
      date: dayjs(entry.createdAt).format('YYYY-MM-DD'),
      createdAt: entry.createdAt,
      classifications: {
        organic: { count: entry.organic.count },
        mixed: { count: entry.mixed.count },
        automation: { count: entry.automation.count },
      },
    })) as ScanEntry[]

    return {
      entries,
      results,
      categoryProgression,
      countsByScanTime,
      scanTimes,
    }
  } catch (error) {
    console.error('Hourly window scan fetch error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch hourly window scan results',
    })
  }
})
