// @unocss-include
import { identityConfig, type IdentityClassification } from '@unveil/identity'
import type {
  EcosystemHealthCategory,
  EcosystemHealthItem,
} from '../types/ecosystem-health'
import { round } from './numbers'

export const INSUFFICIENT_DATA_SCORE = -1

export function classifyByScore(score: number): IdentityClassification {
  if (score === INSUFFICIENT_DATA_SCORE) {
    return 'insufficient-data'
  } else if (score >= identityConfig.THRESHOLD_HUMAN) {
    return 'organic'
  } else if (score >= identityConfig.THRESHOLD_SUSPICIOUS) {
    return 'mixed'
  } else {
    return 'automation'
  }
}

export function formatPercentage(value: number): string {
  return value.toFixed(1)
}

export function formatTrend(value: number = 0) {
  if (value > 0) {
    return `+${round(value * 100, 1)}%`
  }
  return `${round(value * 100, 1)}%`
}

export function getHealthStats(
  data: EcosystemHealthItem[] = [],
): Record<
  EcosystemHealthCategory,
  { count: number; percentage: string }
> | null {
  if (!data.length) {
    return null
  }

  const scored = data.filter((item) => item.score !== INSUFFICIENT_DATA_SCORE)
  const totalCount = scored.length

  if (!totalCount) {
    return null
  }

  const counts: Record<EcosystemHealthCategory, number> = {
    organic: 0,
    mixed: 0,
    automation: 0,
  }

  scored.forEach((item) => {
    const classification = classifyByScore(
      item.score,
    ) as EcosystemHealthCategory
    counts[classification]++
  })

  return {
    organic: {
      count: counts.organic,
      percentage: formatPercentage((counts.organic / totalCount) * 100),
    },
    mixed: {
      count: counts.mixed,
      percentage: formatPercentage((counts.mixed / totalCount) * 100),
    },
    automation: {
      count: counts.automation,
      percentage: formatPercentage((counts.automation / totalCount) * 100),
    },
  }
}

export function getTrendArrow(value: number = 0) {
  if (value > 0) {
    return 'i-lucide:trending-up'
  }
  if (value < 0) {
    return 'i-lucide:trending-down'
  }
  return 'i-lucide:trending-up-down'
}

export function getTrendColor({
  value = 0,
  reversed = false,
}: {
  value?: number
  reversed?: boolean
}) {
  if (value > 0) {
    return reversed ? 'text-gh-danger-hover' : 'text-gh-green'
  }
  if (value < 0) {
    return reversed ? 'text-gh-green' : 'text-gh-danger-hover'
  }
  return 'text-gh-muted'
}
