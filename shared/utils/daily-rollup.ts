import type { IdentityClassification } from '@unveil/identity'
import type {
  EcosystemHealthCategory,
  PrStatus,
} from '../types/ecosystem-health'
import { formatPercentage } from './health-stats'
import { CLASSIFICATION_CATEGORIES } from './count-classification-by-date'

export type DailyClassificationCounts = {
  count: number
  bountyCount: number
  prStatusCounts: Record<PrStatus, number>
}

export type DailyScanEntry = {
  date: string
  createdAt: string
  hours: number
  classifications: Record<IdentityClassification, DailyClassificationCounts>
}

export function getDailyHealthStats(
  entries: DailyScanEntry[],
): Record<
  EcosystemHealthCategory,
  { count: number; percentage: string }
> | null {
  const counts: Record<EcosystemHealthCategory, number> = {
    organic: 0,
    mixed: 0,
    automation: 0,
  }

  entries.forEach((entry) => {
    CLASSIFICATION_CATEGORIES.forEach((category) => {
      counts[category] += entry.classifications[category].count
    })
  })

  const total = CLASSIFICATION_CATEGORIES.reduce(
    (sum, category) => sum + counts[category],
    0,
  )

  if (total === 0) {
    return null
  }

  return {
    organic: {
      count: counts.organic,
      percentage: formatPercentage((counts.organic / total) * 100),
    },
    mixed: {
      count: counts.mixed,
      percentage: formatPercentage((counts.mixed / total) * 100),
    },
    automation: {
      count: counts.automation,
      percentage: formatPercentage((counts.automation / total) * 100),
    },
  }
}
