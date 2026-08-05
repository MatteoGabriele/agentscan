import type { EcosystemHealthCategoryProgression } from '~~/shared/types/ecosystem-health'

import { unpack } from '~~/shared/utils/compactor'
import { getClassificationStatsByScanTime } from '~~/shared/utils/count-classification-by-date'
import { roundToClosestHour } from '~~/shared/utils/dates'

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage('assets:data').getItemRaw(
      'hourly-scan-results.txt',
    )

    if (!raw) {
      throw new Error('hourly-scan-results.txt not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const results = unpack(content).map((entry) => ({
      ...entry,
      created_at: roundToClosestHour(entry.created_at),
    }))

    const automationPercentages: number[] = []
    const mixedPercentages: number[] = []
    const organicPercentages: number[] = []

    // One bucket per hourly scan run, oldest first.
    const countsByScanTime = getClassificationStatsByScanTime(results)
    const scanTimes = Object.keys(countsByScanTime).sort()

    scanTimes.forEach((scanTime) => {
      const counts = countsByScanTime[scanTime]

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

    return {
      results,
      categoryProgression,
      countsByScanTime,
      scanTimes,
    }
  } catch (error) {
    console.error('Hourly ecosystem health fetch error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch hourly scan results',
    })
  }
})
