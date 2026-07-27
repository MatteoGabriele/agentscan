import type { EcosystemHealthItem } from '~~/shared/types/ecosystem-health'

import { unpack } from '~~/shared/utils/compactor'
import {
  getCategoryDeltas,
  getClassificationStatsByDate,
  getWeeklyClassification,
} from '~~/shared/utils/count-classification-by-date'

const TREND_DAYS = 14

export default defineCachedEventHandler(
  async () => {
    const raw = await useStorage('assets:data').getItemRaw('scan-results.txt')

    if (!raw) {
      throw createError({
        statusCode: 500,
        message: 'Scan results unavailable',
      })
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const results: EcosystemHealthItem[] = unpack(content)

    const countsByDate = getClassificationStatsByDate(results)
    const dates = Object.keys(countsByDate).sort()
    const lastDate = dates.at(-1)
    const trendDates = dates.slice(-TREND_DAYS)

    const week = lastDate ? getWeeklyClassification(results, lastDate) : null
    const deltas = getCategoryDeltas(results)

    return {
      updated_at: lastDate
        ? (countsByDate[lastDate]?.createdAt ?? lastDate)
        : null,
      total_scanned: results.length,
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
