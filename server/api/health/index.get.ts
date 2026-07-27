import type {
  EcosystemHealthItem,
  EcosystemHealthCategoryProgression,
} from '~~/shared/types/ecosystem-health'

import { unpack } from '~~/shared/utils/compactor'
import { getClassificationStatsByDate } from '~~/shared/utils/count-classification-by-date'

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage('assets:data').getItemRaw('scan-results.txt')

    if (!raw) {
      throw new Error('scan-results.txt not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const results: EcosystemHealthItem[] = unpack(content)

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
