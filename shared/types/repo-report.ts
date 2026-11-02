import type { ActivityCategory } from './activity'

export type RepoReportDay = {
  date: string
  count: number
  // Mean score of the day's scored PRs, null on days with none.
  score: number | null
}

export type RepoReportPeriod = {
  from: string
  to: string
  count: number
  score: number | null
}

export type RepoReportPullRequest = {
  pr: number | null
  createdAt: string
  classification: ActivityCategory
}

export type RepoReport = {
  repo: string
  days: RepoReportDay[]
  current: RepoReportPeriod
  previous: RepoReportPeriod | null
  ecosystemScore: number | null
  window: {
    counts: Record<ActivityCategory, number>
    total: number
    pullRequests: RepoReportPullRequest[]
  }
}
