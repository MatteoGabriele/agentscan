import type { DailyScanEntry } from '~~/shared/utils/daily-rollup'
import { getDailyCountsByDate } from '~~/shared/utils/daily-rollup'
import { applyCumulativeTrends } from '~~/shared/utils/count-classification-by-date'

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage('assets:data').getItemRaw(
      'daily-scan-results.json',
    )

    if (!raw) {
      throw new Error('daily-scan-results.json not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const entries = JSON.parse(content) as DailyScanEntry[]

    // Same envelope as /api/health, so a chart can read either source without
    // knowing which one it got. Days backfilled from the daily sample and days
    // rolled up from the hourly window are both already one entry per date.
    const countsByDate = getDailyCountsByDate(entries)
    const categoryProgression = applyCumulativeTrends(countsByDate)
    const dates = Object.keys(countsByDate).sort()
    const scanTimes = dates.map(
      (date) => countsByDate[date]?.createdAt ?? `${date}T00:00:00.000Z`,
    )

    return {
      entries,
      categoryProgression,
      countsByDate,
      dates,
      scanTimes,
    }
  } catch (error) {
    console.error('Daily scan fetch error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch daily scan results',
    })
  }
})
