import type { ClassificationStats } from './count-classification-by-date'
import { CLASSIFICATION_NAMES } from './classifications'
import { round } from './numbers'

export const HIGH_SHARE_CATEGORIES = ['automation', 'mixed'] as const

export type HighShareCategory = (typeof HIGH_SHARE_CATEGORIES)[number]

export type HighShareCeilings = Record<HighShareCategory, number>

export type HighShare = {
  category: HighShareCategory
  share: number
  ceiling: number
}

/**
 * 95th percentile of the daily shares from Sep 7 to Nov 13 2026 (68 days),
 * rounded up: automation 34.63 → 35, mixed 11.34 → 12.
 */
export const DAILY_SHARE_CEILINGS: HighShareCeilings = {
  automation: 35,
  mixed: 12,
}

export function findHighShares(
  stats: ClassificationStats,
  ceilings: HighShareCeilings,
): HighShare[] {
  return HIGH_SHARE_CATEGORIES.flatMap((category) => {
    const share = stats[category].percentage
    const ceiling = ceilings[category]

    return share >= ceiling ? [{ category, share, ceiling }] : []
  })
}

export function formatHighShare({
  category,
  share,
  ceiling,
}: HighShare): string {
  return `${CLASSIFICATION_NAMES[category]} share above ${ceiling}%: ${round(share, 1)}%`
}
