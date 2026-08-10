import { unpack } from '~~/shared/utils/compactor'
import {
  applyCumulativeTrends,
  fillEmptyHourlyBuckets,
  getClassificationStatsByScanTime,
} from '~~/shared/utils/count-classification-by-date'
import { WINDOW_MAX_HOURS } from '~~/shared/utils/health-history-window'

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

    return {
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
