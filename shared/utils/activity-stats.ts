// @unocss-include
import { identityConfig, type IdentityClassification } from '@unveil/identity'
import type { ActivityCategory, ActivityItem } from '../types/activity'
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

export function formatProgressionPoints(value: number) {
  const rounded = round(value, 1)
  const sign = value > 0 ? '+' : ''
  const unit = Math.abs(rounded) === 1 ? 'pt' : 'pts'
  return `${sign}${rounded}${unit}`
}

export function getActivityStats(
  data: ActivityItem[] = [],
): Record<ActivityCategory, { count: number; percentage: string }> | null {
  if (!data.length) {
    return null
  }

  const scored = data.filter((item) => item.score !== INSUFFICIENT_DATA_SCORE)
  const totalCount = scored.length

  if (!totalCount) {
    return null
  }

  const counts: Record<ActivityCategory, number> = {
    organic: 0,
    mixed: 0,
    automation: 0,
  }

  scored.forEach((item) => {
    const classification = classifyByScore(item.score) as ActivityCategory
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
    return reversed ? 'text-[--automation]' : 'text-[--organic]'
  }
  if (value < 0) {
    return reversed ? 'text-[--organic]' : 'text-[--automation]'
  }
  return 'text-[--text-muted]'
}
