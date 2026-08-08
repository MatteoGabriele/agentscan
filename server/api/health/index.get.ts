import type { EcosystemHealthItem } from '~~/shared/types/ecosystem-health'

import { unpack } from '~~/shared/utils/compactor'
import {
  applyCumulativeTrends,
  getClassificationStatsByDate,
} from '~~/shared/utils/count-classification-by-date'
import { subtractMonths } from '~~/shared/utils/dates'

const DEFAULT_HISTORY_MONTHS = 2

function getRecentResults(
  results: EcosystemHealthItem[],
): EcosystemHealthItem[] {
  const latestCreatedAt = results.reduce(
    (latest, item) => (item.created_at > latest ? item.created_at : latest),
    '',
  )

  if (!latestCreatedAt) {
    return results
  }

  const rangeStart = subtractMonths({
    date: latestCreatedAt,
    months: DEFAULT_HISTORY_MONTHS,
  })

  return results.filter((item) => item.created_at >= rangeStart)
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const isFullHistory = String(query.full ?? 'false') === 'true'

    const raw = await useStorage('assets:data').getItemRaw('scan-results.txt')

    if (!raw) {
      throw new Error('scan-results.txt not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const allResults = unpack(content)
    const results = isFullHistory ? allResults : getRecentResults(allResults)

    const countsByDate = getClassificationStatsByDate(results)
    const categoryProgression = applyCumulativeTrends(countsByDate)
    const dates = Object.keys(countsByDate).sort()

    const scanTimes = dates.map(
      (date) => countsByDate[date]?.createdAt ?? `${date}T00:00:00.000Z`,
    )

    return {
      results,
      categoryProgression,
      countsByDate,
      dates,
      scanTimes,
    }
  } catch (error) {
    console.error('Ecosystem health fetch error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch verified automations list',
    })
  }
})
