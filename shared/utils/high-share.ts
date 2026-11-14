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

/** Set from the stable dataset (Sep 7 – Nov 13 2026); only the highest day per category reached them. */
export const DAILY_SHARE_CEILINGS: HighShareCeilings = {
  automation: 36,
  mixed: 12,
}

/** Hours are noisier than days, so they need their own, higher ceilings. */
export const HOURLY_SHARE_CEILINGS: HighShareCeilings = {
  automation: 45,
  mixed: 25,
}

export const HOURLY_MIN_TOTAL = 50

export function findHighShares(
  stats: ClassificationStats,
  ceilings: HighShareCeilings,
  minTotal = 0,
): HighShare[] {
  if (stats.total.count < minTotal) {
    return []
  }

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
