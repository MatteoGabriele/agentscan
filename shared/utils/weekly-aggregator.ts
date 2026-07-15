import { identityConfig } from '@unveil/identity'
import type {
  EcosystemHealthItem,
  EcosystemHealthWeeklyItem,
} from '../types/ecosystem-health'
import {
  getMondayDateKey,
  getSundayDateKey,
  getWeeklyClassification,
} from './count-classification-by-date'
import { getClosedPrPercentageByRepo, getDayKey } from './charts'

export function buildWeeklyEntry(
  items: EcosystemHealthItem[],
  referenceDate: string,
): EcosystemHealthWeeklyItem {
  const weekStart = getMondayDateKey(referenceDate)
  const weekEnd = getSundayDateKey(referenceDate)

  const weekItems = items.filter((item) => {
    const day = getDayKey(item.created_at)
    return day >= weekStart && day <= weekEnd
  })

  const classification = getWeeklyClassification(weekItems, weekEnd, false)

  const closedPrStatsByRepo = getClosedPrPercentageByRepo(weekItems, {
    scoreBounds: [0, identityConfig.THRESHOLD_SUSPICIOUS],
  })

  const eligiblePrs = closedPrStatsByRepo.reduce(
    (sum, repo) => sum + repo.eligiblePrs,
    0,
  )
  const closedPrs = closedPrStatsByRepo.reduce(
    (sum, repo) => sum + repo.closedPrs,
    0,
  )

  return {
    weekStart,
    weekEnd,
    createdAt: new Date().toISOString(),
    organic: {
      count: classification.organic.count,
      percentage: classification.organic.percentage,
    },
    mixed: {
      count: classification.mixed.count,
      percentage: classification.mixed.percentage,
    },
    automation: {
      count: classification.automation.count,
      percentage: classification.automation.percentage,
    },
    total: classification.total.count,
    automationClosure: {
      eligiblePrs,
      closedPrs,
      percentage:
        eligiblePrs === 0 ? 100 : Math.round((closedPrs / eligiblePrs) * 100),
    },
  }
}
