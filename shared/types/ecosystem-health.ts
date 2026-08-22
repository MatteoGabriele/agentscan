import type { VueUiXyDatasetItem, VueUiXySeries } from 'vue-data-ui/vue-ui-xy'
import type { calcLinearProgression } from '../utils/calc-linear-progression'
import type { IdentityClassification } from '@unveil/identity'

export type PrStatus = 'open' | 'closed' | 'merged'

// Categories plotted on the health graph. "insufficient-data" scans are stored
// with a negative score and excluded from every aggregate.
export type EcosystemHealthCategory = Exclude<
  IdentityClassification,
  'insufficient-data'
>

export type EcosystemHealthItem = {
  created_at: string
  score: number
  pr_key: string
  pr_status: PrStatus
  user_created_at: string
  user_public_repos_count: number
  events_count: number
  repo_name: string
  is_bounty: boolean
}

export type EcosystemHealthCategoryCounts = {
  automation: number
  mixed: number
  organic: number
}

export type EcosystemHealthCategoryProgression = Record<
  EcosystemHealthCategory,
  ReturnType<typeof calcLinearProgression>
>

export type VueUiXyDatasetItemWithTrends = VueUiXyDatasetItem & {
  trends: number[]
}

export type VueUiXySeriesWithCounts = Array<
  VueUiXySeries & { counts: number[] }
>

export type EventsEvolutionSeries = VueUiXyDatasetItem & {
  category: EcosystemHealthCategory
  trends: number[]
  counts: number[]
  totals: number[]
}
