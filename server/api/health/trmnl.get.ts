import type { DailyScanEntry } from '~~/shared/utils/daily-rollup'

import { getDailyCountsByDate } from '~~/shared/utils/daily-rollup'
import {
  getCategoryDeltasByDate,
  getWeeklyClassificationByDate,
} from '~~/shared/utils/count-classification-by-date'

const TREND_DAYS = 14

export default defineCachedEventHandler(
  async () => {
    const raw = await useStorage('assets:data').getItemRaw(
      'daily-scan-results.json',
    )

    if (!raw) {
      throw createError({
        statusCode: 500,
        message: 'Scan results unavailable',
      })
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const entries = JSON.parse(content) as DailyScanEntry[]

    const countsByDate = getDailyCountsByDate(entries)
    const dates = Object.keys(countsByDate).sort()
    const lastDate = dates.at(-1)
    const trendDates = dates.slice(-TREND_DAYS)

    const week = lastDate
      ? getWeeklyClassificationByDate(countsByDate, lastDate)
      : null
    const deltas = getCategoryDeltasByDate(countsByDate)

    return {
      updated_at: lastDate
        ? (countsByDate[lastDate]?.createdAt ?? lastDate)
        : null,
      total_scanned: dates.reduce(
        (total, date) => total + (countsByDate[date]?.total.count ?? 0),
        0,
      ),
      week: week
        ? {
            total: week.total.count,
            organic: {
              percentage: week.organic.percentage,
              trend: week.organic.trend,
            },
            mixed: {
              percentage: week.mixed.percentage,
              trend: week.mixed.trend,
            },
            automation: {
              percentage: week.automation.percentage,
              trend: week.automation.trend,
            },
          }
        : null,
      deltas: {
        organic: deltas.organic.percentagePointDifference,
        mixed: deltas.mixed.percentagePointDifference,
        automation: deltas.automation.percentagePointDifference,
      },
      trend: {
        dates: trendDates,
        organic: trendDates.map(
          (d) => countsByDate[d]?.organic.percentage ?? 0,
        ),
        mixed: trendDates.map((d) => countsByDate[d]?.mixed.percentage ?? 0),
        automation: trendDates.map(
          (d) => countsByDate[d]?.automation.percentage ?? 0,
        ),
      },
    }
  },
  {
    maxAge: 60 * 15,
    getKey: () => 'ecosystem-health-trmnl',
  },
)
