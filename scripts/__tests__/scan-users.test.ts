import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { Octokit } from 'octokit'
import {
  collectPrs,
  mergeAutomationIds,
  previousHourWindow,
  trimToRecentScans,
} from '../scan-users'
import { libraries } from '../../shared/daily-scan'
import type { EcosystemHealthItem } from '../../shared/types/ecosystem-health'
import { getCompletedDailyEntries } from '../../shared/utils/daily-rollup'

vi.mock('../../shared/daily-scan', () => ({ libraries: ['acme/lib'] }))
vi.mock('../hash-value', () => ({
  hashValue: (...parts: (string | number)[]) => parts.join('#'),
}))

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

/** Runs `fn` with the scanned repo list temporarily replaced. */
async function withLibraries<T>(repos: string[], fn: () => Promise<T>) {
  const original = [...libraries]
  libraries.splice(0, libraries.length, ...repos)
  try {
    return await fn()
  } finally {
    libraries.splice(0, libraries.length, ...original)
  }
}

const WINDOW = {
  start: new Date('2026-08-07T07:00:00Z'),
  end: new Date('2026-08-07T08:00:00Z'),
}

type PrFixture = {
  number: number
  login: string
  created_at: string
  state?: 'open' | 'closed'
  merged_at?: string | null
}

function makeOctokit(pages: PrFixture[][]) {
  const userCalls: string[] = []

  const octokit = {
    rest: {
      pulls: {
        list: vi.fn(async ({ page }: { page: number }) => ({
          data: (pages[page - 1] ?? []).map((pr) => ({
            number: pr.number,
            created_at: pr.created_at,
            state: pr.state ?? 'open',
            merged_at: pr.merged_at ?? null,
            user: { login: pr.login },
          })),
        })),
      },
      users: {
        getByUsername: vi.fn(async ({ username }: { username: string }) => {
          userCalls.push(username)
          return {
            data: {
              id: username.length,
              login: username,
              created_at: '2020-01-01T00:00:00Z',
              public_repos: 3,
            },
          }
        }),
      },
    },
  }

  return { octokit: octokit as unknown as Octokit, userCalls }
}

/**
 * Multi-repo variant: each repo maps either to its pages, or to an Error the
 * PR listing rejects with, so a failing repo can sit next to a healthy one.
 */
function makeMultiRepoOctokit(repos: Record<string, PrFixture[][] | Error>) {
  const { octokit } = makeOctokit([])

  octokit.rest.pulls.list = vi.fn(
    async ({
      owner,
      repo,
      page,
    }: {
      owner: string
      repo: string
      page: number
    }) => {
      const entry = repos[`${owner}/${repo}`]
      if (entry instanceof Error) {
        throw entry
      }
      return {
        data: (entry?.[page - 1] ?? []).map((pr) => ({
          number: pr.number,
          created_at: pr.created_at,
          state: pr.state ?? 'open',
          merged_at: pr.merged_at ?? null,
          user: { login: pr.login },
        })),
      }
    },
  ) as unknown as Octokit['rest']['pulls']['list']

  return octokit
}

const prPage = (repo: string, count: number): PrFixture[] =>
  Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    login: `${repo}-author-${i}`,
    created_at: '2026-08-07T07:30:00Z',
  }))

describe('previousHourWindow', () => {
  it('covers the previous full clock hour', () => {
    const { start, end } = previousHourWindow(new Date('2026-08-07T08:04:19Z'))
    expect(start.toISOString()).toBe('2026-08-07T07:00:00.000Z')
    expect(end.toISOString()).toBe('2026-08-07T08:00:00.000Z')
  })

  it('stays gap-free when a run starts late', () => {
    const late = previousHourWindow(new Date('2026-08-07T08:58:00Z'))
    const next = previousHourWindow(new Date('2026-08-07T09:02:00Z'))
    expect(late.end.toISOString()).toBe(next.start.toISOString())
  })

  it('rolls back across a day boundary', () => {
    const { start } = previousHourWindow(new Date('2026-08-07T00:30:00Z'))
    expect(start.toISOString()).toBe('2026-08-06T23:00:00.000Z')
  })
})

describe('collectPrs', () => {
  it('keeps the fixed sample untouched when no window is requested', async () => {
    const { octokit } = makeOctokit([
      [
        { number: 3, login: 'ada', created_at: '2026-08-07T08:30:00Z' },
        { number: 2, login: 'bob', created_at: '2026-08-07T07:30:00Z' },
        { number: 1, login: 'cat', created_at: '2026-08-01T00:00:00Z' },
      ],
    ])

    const { sample, windowed } = await collectPrs(octokit, 2)

    expect(sample.map((pr) => pr.pr_key)).toEqual(['acme/lib#3', 'acme/lib#2'])
    expect(windowed).toEqual([])
    // Only page 1 is ever read without a window.
    expect(octokit.rest.pulls.list).toHaveBeenCalledTimes(1)
  })

  it('windows on created_at, keeping closed and merged PRs', async () => {
    const { octokit } = makeOctokit([
      [
        // Opened after the window closed — sample only.
        { number: 5, login: 'ada', created_at: '2026-08-07T08:10:00Z' },
        // Opened and closed inside the window: the spam-PR case.
        {
          number: 4,
          login: 'bob',
          created_at: '2026-08-07T07:12:00Z',
          state: 'closed',
        },
        {
          number: 3,
          login: 'cat',
          created_at: '2026-08-07T07:40:00Z',
          state: 'closed',
          merged_at: '2026-08-07T07:55:00Z',
        },
        { number: 2, login: 'dot', created_at: '2026-08-07T07:59:59Z' },
        // Predates the window.
        { number: 1, login: 'eve', created_at: '2026-08-07T06:59:59Z' },
      ],
    ])

    const { sample, windowed } = await collectPrs(octokit, 2, WINDOW)

    expect(sample.map((pr) => pr.pr_key)).toEqual(['acme/lib#5', 'acme/lib#4'])
    expect(windowed.map((pr) => pr.pr_key)).toEqual([
      'acme/lib#4',
      'acme/lib#3',
      'acme/lib#2',
    ])
    expect(windowed.map((pr) => pr.pr_status)).toEqual([
      'closed',
      'merged',
      'open',
    ])
  })

  it('treats the window as half-open on both edges', async () => {
    const { octokit } = makeOctokit([
      [
        { number: 3, login: 'ada', created_at: '2026-08-07T08:00:00Z' },
        { number: 2, login: 'bob', created_at: '2026-08-07T07:00:00Z' },
        { number: 1, login: 'cat', created_at: '2026-08-07T06:59:59Z' },
      ],
    ])

    const { windowed } = await collectPrs(octokit, 1, WINDOW)

    // 08:00:00 belongs to the next window, 07:00:00 to this one.
    expect(windowed.map((pr) => pr.pr_key)).toEqual(['acme/lib#2'])
  })

  it('returns an empty window for a quiet hour without throwing', async () => {
    const { octokit } = makeOctokit([
      [
        { number: 2, login: 'ada', created_at: '2026-08-05T10:00:00Z' },
        { number: 1, login: 'bob', created_at: '2026-08-04T10:00:00Z' },
      ],
    ])

    const { sample, windowed } = await collectPrs(octokit, 2, WINDOW)

    expect(sample).toHaveLength(2)
    expect(windowed).toEqual([])
  })

  it('skips a repo that cannot fill the fixed sample', async () => {
    const { octokit } = makeOctokit([
      [{ number: 1, login: 'ada', created_at: '2026-08-07T07:10:00Z' }],
    ])

    // Single-repo library, so the only repo failing empties the run.
    await expect(collectPrs(octokit, 10, WINDOW)).rejects.toThrow(
      'all 1 repos failed',
    )
  })

  it('keeps scanning the other repos when one fails', async () => {
    const octokit = makeMultiRepoOctokit({
      'acme/lib': [prPage('lib', 3)],
      'acme/gone': new Error('Not Found'),
      'acme/other': [prPage('other', 3)],
    })

    const { sample, windowed, skipped } = await withLibraries(
      ['acme/lib', 'acme/gone', 'acme/other'],
      async () => {
        vi.useFakeTimers()
        try {
          // The failing repo burns through its retries on fake timers.
          const pending = collectPrs(octokit, 2, WINDOW)
          await vi.runAllTimersAsync()
          return await pending
        } finally {
          vi.useRealTimers()
        }
      },
    )

    expect(sample.map((pr) => pr.repo_name)).toEqual([
      'acme/lib',
      'acme/lib',
      'acme/other',
      'acme/other',
    ])
    expect(windowed).toHaveLength(6)
    expect(skipped).toEqual([{ repo_name: 'acme/gone', reason: 'Not Found' }])
  })

  it('drops the partial rows of a repo that fails mid-collection', async () => {
    const octokit = makeMultiRepoOctokit({
      // Two PRs against a sample of three: collected, then discarded.
      'acme/thin': [prPage('thin', 2)],
      'acme/full': [prPage('full', 3)],
    })

    const { sample, windowed, skipped } = await withLibraries(
      ['acme/thin', 'acme/full'],
      () => collectPrs(octokit, 3, WINDOW),
    )

    expect(sample.map((pr) => pr.repo_name)).toEqual([
      'acme/full',
      'acme/full',
      'acme/full',
    ])
    // Not even the windowed rows of the failed repo survive.
    expect(windowed.map((pr) => pr.repo_name)).toEqual([
      'acme/full',
      'acme/full',
      'acme/full',
    ])
    expect(skipped).toEqual([
      { repo_name: 'acme/thin', reason: 'only 2/3 PRs collected' },
    ])
  })

  it('aborts when every repo fails', async () => {
    const octokit = makeMultiRepoOctokit({
      'acme/lib': [prPage('lib', 1)],
      'acme/other': [prPage('other', 1)],
    })

    await expect(
      withLibraries(['acme/lib', 'acme/other'], () =>
        collectPrs(octokit, 5, WINDOW),
      ),
    ).rejects.toThrow('all 2 repos failed')
  })

  it('pages until it reaches the start of the window', async () => {
    // One author throughout, so the profile cache keeps the test fast.
    const page = (from: number, at: string) =>
      Array.from({ length: 50 }, (_, i) => ({
        number: from - i,
        login: 'ada',
        created_at: at,
      }))

    const { octokit } = makeOctokit([
      page(150, '2026-08-07T07:50:00Z'),
      page(100, '2026-08-07T07:20:00Z'),
      // This page ends before the window starts, so paging stops here.
      page(50, '2026-08-07T06:30:00Z'),
    ])

    const { windowed } = await collectPrs(octokit, 10, WINDOW)

    expect(octokit.rest.pulls.list).toHaveBeenCalledTimes(3)
    expect(windowed).toHaveLength(100)
  })

  it('fetches each author profile once across both datasets', async () => {
    const { octokit, userCalls } = makeOctokit([
      [
        { number: 3, login: 'ada', created_at: '2026-08-07T07:50:00Z' },
        { number: 2, login: 'ada', created_at: '2026-08-07T07:40:00Z' },
        { number: 1, login: 'bob', created_at: '2026-08-07T07:30:00Z' },
      ],
    ])

    const { sample, windowed } = await collectPrs(octokit, 3, WINDOW)

    expect(sample).toHaveLength(3)
    expect(windowed).toHaveLength(3)
    expect(userCalls).toEqual(['ada', 'bob'])
  })

  it('skips known bots in both datasets', async () => {
    const { octokit } = makeOctokit([
      [
        {
          number: 3,
          login: 'dependabot[bot]',
          created_at: '2026-08-07T07:50:00Z',
        },
        { number: 2, login: 'ada', created_at: '2026-08-07T07:40:00Z' },
        { number: 1, login: 'bob', created_at: '2026-08-07T07:30:00Z' },
      ],
    ])

    const { sample, windowed } = await collectPrs(octokit, 2, WINDOW)

    expect(sample.map((pr) => pr.login)).toEqual(['ada', 'bob'])
    expect(windowed.map((pr) => pr.login)).toEqual(['ada', 'bob'])
  })
})

describe('daily rollup at the first midnight rollover', () => {
  const WINDOW_MAX_SCANS = 24

  function hourlyRow(createdAt: string): EcosystemHealthItem {
    return {
      created_at: createdAt,
      score: 90,
      pr_key: `acme/lib#${createdAt}`,
      pr_status: 'open',
      user_created_at: '2020-01-01T00:00:00Z',
      user_public_repos_count: 3,
      events_count: 30,
      repo_name: 'acme/lib',
      is_bounty: false,
    }
  }

  // The run that first completes a day: the file already holds a full day of
  // hourly buckets, and this run appends the day's first bucket past midnight.
  const windowResults = [
    ...Array.from({ length: 24 }, (_, hour) =>
      hourlyRow(`2026-06-10T${String(hour).padStart(2, '0')}:00:00.000Z`),
    ),
    hourlyRow('2026-06-11T00:00:00.000Z'),
  ]
  const SCANNED_HOUR = '2026-06-11T00:00:00.000Z'

  it('rolls the completed day up from the untrimmed window rows', () => {
    const entries = getCompletedDailyEntries(windowResults, SCANNED_HOUR)

    expect(entries.map((entry) => [entry.date, entry.hours])).toEqual([
      ['2026-06-10', 24],
    ])
  })

  it('would lose that day for good if it rolled up the retained rows', () => {
    // Retention drops 2026-06-10T00:00 on this very run, and a day missing its
    // first hour reads as partly aged out — it is skipped now and on every run
    // after, since the window only moves further past it.
    const retained = trimToRecentScans(windowResults, WINDOW_MAX_SCANS)

    expect(retained[0]?.created_at).toBe('2026-06-10T01:00:00.000Z')
    expect(getCompletedDailyEntries(retained, SCANNED_HOUR)).toEqual([])
  })
})

describe('mergeAutomationIds', () => {
  // Stand-ins for `hashUserId` output: the merge only ever compares them.
  const ADA = 'a1a1a1'
  const BOB = 'b2b2b2'
  const CAT = 'c3c3c3'

  it('starts new ids at one and keeps them in the order first seen', () => {
    expect(mergeAutomationIds([], [ADA, BOB])).toEqual([
      [ADA, 1],
      [BOB, 1],
    ])
  })

  it('bumps known ids in place and appends only the unseen ones', () => {
    const stored: [string, number][] = [
      [ADA, 2],
      [BOB, 1],
    ]

    expect(mergeAutomationIds(stored, [BOB, CAT])).toEqual([
      [ADA, 2],
      [BOB, 2],
      [CAT, 1],
    ])
  })

  it('leaves the stored tally untouched', () => {
    const stored: [string, number][] = [[ADA, 2]]

    mergeAutomationIds(stored, [ADA])

    expect(stored).toEqual([[ADA, 2]])
  })

  it('counts a repeated id once per PR, not once per run', () => {
    // Mirrors the caller: one entry per automation-scored PR, so an account
    // that spammed three PRs in a scan moves its counter by three.
    expect(mergeAutomationIds([[ADA, 1]], [ADA, ADA, ADA])).toEqual([[ADA, 4]])
  })

  it('starts a new id at its PR count in the same run', () => {
    expect(mergeAutomationIds([], [BOB, BOB])).toEqual([[BOB, 2]])
  })
})
