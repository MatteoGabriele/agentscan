import type { ClassificationStats } from './count-classification-by-date'
import { CLASSIFICATION_NAMES } from './classifications'
import { round } from './numbers'

export const HIGH_SHARE_CATEGORIES = ['automation', 'mixed'] as const

export type HighShareCategory = (typeof HIGH_SHARE_CATEGORIES)[number]

export type HighShareCeilings = Record<HighShareCategory, number | null>

export type HighShare = {
  category: HighShareCategory
  share: number
  ceiling: number
}

/**
 * automation: 95th percentile of the daily shares from Sep 7 to Nov 13 2026
 * (68 days), rounded up: 34.63 → 35.
 *
 * mixed: paused. @unveil/identity 3.2/3.3 (live from Nov 15 2026) caps AI agent
 * accounts at "mixed", which moved the daily share from ~10% to ~22%.
 * Re-measure as the 95th percentile once ~4 weeks exist (mid-Dec 2026).
 */
export const DAILY_SHARE_CEILINGS: HighShareCeilings = {
  automation: 35,
  mixed: null,
}

export function findHighShares(
  stats: ClassificationStats,
  ceilings: HighShareCeilings,
): HighShare[] {
  return HIGH_SHARE_CATEGORIES.flatMap((category) => {
    const share = stats[category].percentage
    const ceiling = ceilings[category]

    return ceiling !== null && share >= ceiling
      ? [{ category, share, ceiling }]
      : []
  })
}

export function formatHighShare({
  category,
  share,
  ceiling,
}: HighShare): string {
  return `${CLASSIFICATION_NAMES[category]} share above ${ceiling}%: ${round(share, 1)}%`
}
