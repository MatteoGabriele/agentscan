// The responses agentscan-logs serves. The scan, the data files and the
// aggregation all live in that repo; the routes under server/api/health and
// server/api/automation-tally here only pass them through, so these types are
// the contract between the two.

import type {
  EcosystemHealthCategoryProgression,
  EcosystemHealthItem,
} from './ecosystem-health'
import type { GetClassificationStatsByDateResults } from '../utils/count-classification-by-date'
import type { DailyScanEntry } from '../utils/daily-rollup'

export type EcosystemHealthDailyResponse = {
  entries: DailyScanEntry[]
  categoryProgression: EcosystemHealthCategoryProgression
  countsByDate: GetClassificationStatsByDateResults
  dates: string[]
  scanTimes: string[]
}

export type EcosystemHealthHourlyWindowResponse = {
  results: EcosystemHealthItem[]
  categoryProgression: EcosystemHealthCategoryProgression
  countsByScanTime: GetClassificationStatsByDateResults
  scanTimes: string[]
}

type TrmnlCategory = {
  percentage: number
  trend: number
}

export type EcosystemHealthTrmnlResponse = {
  updated_at: string | null
  total_scanned: number
  week: {
    total: number
    organic: TrmnlCategory
    mixed: TrmnlCategory
    automation: TrmnlCategory
  } | null
  deltas: {
    organic: number | null
    mixed: number | null
    automation: number | null
  }
  trend: {
    dates: string[]
    organic: number[]
    mixed: number[]
    automation: number[]
  }
}

export type AutomationTallyResponse = {
  id: number
  counter: number
}[]
