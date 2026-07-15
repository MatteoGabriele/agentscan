import type { calcLinearProgression } from '../utils/calc-linear-progression'
import type { IdentityClassification } from '@unveil/identity'

export type EcosystemHealthItem = {
  created_at: string
  score: number
  pr_key: string
  pr_status: string // FIXME: narrow down
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
  IdentityClassification,
  ReturnType<typeof calcLinearProgression>
>

export type EcosystemHealthCategoryStat = {
  count: number
  percentage: number
}

export type EcosystemHealthWeeklyItem = {
  weekStart: string
  weekEnd: string
  createdAt: string
  organic: EcosystemHealthCategoryStat
  mixed: EcosystemHealthCategoryStat
  automation: EcosystemHealthCategoryStat
  total: number
  automationClosure: {
    eligiblePrs: number
    closedPrs: number
    percentage: number
  }
}
