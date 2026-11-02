import { describe, expect, it } from 'vitest'
import type { ActivityItem } from '../types/activity'
import type { ActivityRepoScoreDay } from '../types/logs-api'
import { INSUFFICIENT_DATA_SCORE } from './activity-stats'
import {
  findRepoName,
  getRepoReport,
  REPO_REPORT_PERIOD_DAYS,
} from './repo-report'

function createDays(
  count: number,
  repos: ActivityRepoScoreDay['repos'],
): ActivityRepoScoreDay[] {
  const start = new Date('2026-01-01').getTime()
  const oneDay = 24 * 60 * 60 * 1000

  return Array.from({ length: count }, (_, index) => ({
    date: new Date(start + index * oneDay).toISOString().slice(0, 10),
    repos,
  }))
}

function createItem(item: Partial<ActivityItem>): ActivityItem {
  return {
    created_at: '2026-01-01T10:00:00.000Z',
    score: 100,
    pr_key: '',
    pr_status: 'open',
    user_created_at: '2020-01-01T00:00:00.000Z',
    user_public_repos_count: 10,
    events_count: 100,
    repo_name: 'nuxt/nuxt',
    is_bounty: false,
    ...item,
  }
}

describe('findRepoName', () => {
  it('returns the canonical spelling regardless of casing', () => {
    const days = createDays(1, [
      { name: 'All-Hands-AI/OpenHands', count: 1, scoreSum: 90 },
    ])

    expect(
      findRepoName({
        repo: 'all-hands-ai/openhands',
        days,
        results: [],
      }),
    ).toBe('All-Hands-AI/OpenHands')
  })

  it('falls back to the hourly window', () => {
    const results = [createItem({ repo_name: 'vuejs/core' })]

    expect(findRepoName({ repo: 'VueJS/Core', days: [], results })).toBe(
      'vuejs/core',
    )
  })

  it('returns null for untracked repos', () => {
    expect(findRepoName({ repo: 'a/b', days: [], results: [] })).toBeNull()
  })
})

describe('getRepoReport', () => {
  it('splits the history into current and previous periods', () => {
    const days = createDays(REPO_REPORT_PERIOD_DAYS * 2, [
      { name: 'nuxt/nuxt', count: 2, scoreSum: 150 },
    ])
    const lastDay = days.at(-1)

    if (lastDay) {
      lastDay.repos = [{ name: 'nuxt/nuxt', count: 2, scoreSum: 50 }]
    }

    const report = getRepoReport({
      repo: 'nuxt/nuxt',
      days,
      results: [],
    })

    expect(report.days).toHaveLength(REPO_REPORT_PERIOD_DAYS * 2)
    expect(report.current.count).toBe(REPO_REPORT_PERIOD_DAYS * 2)
    expect(report.current.score).toBeCloseTo(
      (150 * (REPO_REPORT_PERIOD_DAYS - 1) + 50) /
        (REPO_REPORT_PERIOD_DAYS * 2),
    )
    expect(report.previous?.score).toBe(75)
  })

  it('has no previous period without a full span of history', () => {
    const days = createDays(REPO_REPORT_PERIOD_DAYS + 5, [
      { name: 'nuxt/nuxt', count: 1, scoreSum: 90 },
    ])

    expect(
      getRepoReport({ repo: 'nuxt/nuxt', days, results: [] }).previous,
    ).toBeNull()
  })

  it('fills missing days with an empty entry', () => {
    const days = [
      {
        date: '2026-01-01',
        repos: [{ name: 'nuxt/nuxt', count: 1, scoreSum: 80 }],
      },
      {
        date: '2026-01-03',
        repos: [{ name: 'nuxt/nuxt', count: 1, scoreSum: 60 }],
      },
    ]

    const report = getRepoReport({
      repo: 'nuxt/nuxt',
      days,
      results: [],
    })

    expect(report.days).toEqual([
      { date: '2026-01-01', count: 1, score: 80 },
      { date: '2026-01-02', count: 0, score: null },
      { date: '2026-01-03', count: 1, score: 60 },
    ])
  })

  it('averages the ecosystem across every repo in the current period', () => {
    const days = createDays(1, [
      { name: 'a/a', count: 1, scoreSum: 100 },
      { name: 'b/b', count: 3, scoreSum: 0 },
    ])

    expect(
      getRepoReport({ repo: 'a/a', days, results: [] }).ecosystemScore,
    ).toBe(25)
  })

  it('classifies the hourly window and skips unscoreable PRs', () => {
    const results = [
      createItem({ pr: 1, score: 100, created_at: '2026-01-01T09:00:00.000Z' }),
      createItem({ pr: 2, score: 0, created_at: '2026-01-01T11:00:00.000Z' }),
      createItem({ pr: 3, score: INSUFFICIENT_DATA_SCORE }),
      createItem({ pr: 4, score: 100, repo_name: 'vuejs/core' }),
    ]

    const { window } = getRepoReport({
      repo: 'nuxt/nuxt',
      days: [],
      results,
    })

    expect(window.total).toBe(2)
    expect(window.counts).toEqual({ organic: 1, mixed: 0, automation: 1 })
    expect(window.pullRequests.map((item) => item.pr)).toEqual([2, 1])
  })
})
