import type {
  EcosystemHealthItem,
  EcosystemHealthCategoryProgression,
} from '~~/shared/types/ecosystem-health'

import { unpack } from '~~/shared/utils/compactor'
import { getClassificationStatsByDate } from '~~/shared/utils/count-classification-by-date'
import { subtractMonths } from '~~/shared/utils/dates'

const DEFAULT_HISTORY_MONTHS = 2

function getRecentResults({
  results,
  months,
}: {
  results: EcosystemHealthItem[]
  months: number
}): EcosystemHealthItem[] {
  const latestCreatedAt = results.reduce(
    (latest, item) => (item.created_at > latest ? item.created_at : latest),
    '',
  )

  if (!latestCreatedAt) {
    return results
  }

  const rangeStart = subtractMonths({
    date: latestCreatedAt,
    months,
  })

  return results.filter((item) => item.created_at >= rangeStart)
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const isFullHistory = String(query.full ?? 'false') === 'true'
    const requestedMonths = Number(query.months ?? DEFAULT_HISTORY_MONTHS)
    const months =
      Number.isInteger(requestedMonths) && requestedMonths > 0
        ? requestedMonths
        : DEFAULT_HISTORY_MONTHS

    const raw = await useStorage('assets:data').getItemRaw('scan-results.txt')

    if (!raw) {
      throw new Error('scan-results.txt not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const allResults = unpack(content)
    const results = isFullHistory
      ? allResults
      : getRecentResults({ results: allResults, months })

    const automationPercentages: number[] = []
    const mixedPercentages: number[] = []
    const organicPercentages: number[] = []

    const countsByDate = getClassificationStatsByDate(results)
    const dates = Object.keys(countsByDate).sort()

    dates.forEach((date) => {
      const counts = countsByDate[date]
      if (!counts) {
        return
      }

      automationPercentages.push(counts.automation.percentage)
      mixedPercentages.push(counts.mixed.percentage)
      organicPercentages.push(counts.organic.percentage)

      counts.automation.trend = calcLinearProgression(
        automationPercentages,
      ).trend
      counts.mixed.trend = calcLinearProgression(mixedPercentages).trend
      counts.organic.trend = calcLinearProgression(organicPercentages).trend
    })

    const categoryProgression: EcosystemHealthCategoryProgression = {
      automation: calcLinearProgression(automationPercentages),
      mixed: calcLinearProgression(mixedPercentages),
      organic: calcLinearProgression(organicPercentages),
    }

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
