import type { ClassificationLabel } from '@unveil/identity'
import type { ActivityCategory } from '../types/activity'
import type { PullRequestState } from '../types/scan'
import { INSUFFICIENT_DATA_SCORE } from './activity-stats'

/** Shown instead of a classification when an account has too little activity. */
export const INSUFFICIENT_ACTIVITY_NAME = 'Not enough activity'

/** Shown instead of a classification when the community reported the account. */
export const COMMUNITY_REPORTED_NAME = 'Community reported'

export type ClassificationCounts = {
  counts: Record<ActivityCategory, number>
  // Kept apart: an account without enough activity has no classification.
  insufficient: number
  // Kept apart too: the row shows the report, not the classification.
  communityReported: number
}

/** GitHub lists merged pull requests as closed, so `merged_at` tells them apart. */
export function getPullRequestState({
  state,
  merged_at,
}: {
  state: string
  merged_at: string | null
}): PullRequestState {
  if (merged_at) {
    return 'merged'
  }

  return state === 'open' ? 'open' : 'closed'
}

/**
 * The account's classification, with the insufficient-data score mapped
 * explicitly so it can never read as one of the three groups.
 */
export function getAuthorClassification({
  score,
  classification,
}: {
  score: number
  classification: ClassificationLabel
}): ClassificationLabel {
  return score === INSUFFICIENT_DATA_SCORE
    ? 'insufficient-data'
    : classification
}

/**
 * Counts rows the way their tags read: a community-reported row counts as
 * reported, whatever its classification.
 */
export function countClassifications(
  rows: { classification: ClassificationLabel; communityReported: boolean }[],
): ClassificationCounts {
  const result: ClassificationCounts = {
    counts: { organic: 0, mixed: 0, automation: 0 },
    insufficient: 0,
    communityReported: 0,
  }

  for (const { classification, communityReported } of rows) {
    if (communityReported) {
      result.communityReported++
    } else if (classification === 'insufficient-data') {
      result.insufficient++
    } else {
      result.counts[classification]++
    }
  }

  return result
}
