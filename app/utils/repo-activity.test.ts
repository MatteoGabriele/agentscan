import { describe, expect, it } from 'vitest'
import {
  fromGitHubEvent,
  type GitHubEvent,
} from '@unveil/identity/providers/github'
import {
  describeActivityBreakdown,
  filterByCategory,
  formatEventShare,
  getEventSpanDays,
  getEventCategories,
  getEventTypeLabel,
  groupEventsByRepo,
  summarizeEvents,
  summarizeEventTypes,
  type RepoEvent,
} from './repo-activity'

function event(
  type: string,
  repo: string | undefined,
  at: string,
  // GitHub sends more payload fields than the provider types (e.g. issue numbers).
  payload?: Record<string, unknown>,
): RepoEvent {
  const raw: GitHubEvent = {
    type,
    created_at: at,
    repo: repo ? { name: repo } : undefined,
    payload: payload as GitHubEvent['payload'],
  }
  return fromGitHubEvent(raw, 'someone')
}

const events = [
  event('PullRequestEvent', 'a/one', '2026-10-01T10:00:00Z'),
  event('PullRequestEvent', 'b/two', '2026-10-02T10:00:00Z'),
  event('IssueCommentEvent', 'a/one', '2026-10-03T10:00:00Z'),
  event('PullRequestEvent', 'a/one', '2026-10-04T10:00:00Z'),
  event('ForkEvent', 'c/three', '2026-10-05T10:00:00Z'),
  event('PushEvent', undefined, '2026-10-06T10:00:00Z'),
]

describe('groupEventsByRepo', () => {
  it('puts the busiest repo first, breaking ties by most recent', () => {
    const groups = groupEventsByRepo(events)

    expect(groups.map((group) => [group.repo, group.events.length])).toEqual([
      ['a/one', 3],
      ['c/three', 1],
      ['b/two', 1],
    ])
  })

  it('sorts each repo’s events newest first', () => {
    const [busiest] = groupEventsByRepo(events)

    expect(busiest?.events.map((e) => e.at)).toEqual([
      '2026-10-04T10:00:00Z',
      '2026-10-03T10:00:00Z',
      '2026-10-01T10:00:00Z',
    ])
  })

  it('skips events without a repo', () => {
    const repos = groupEventsByRepo(events).map((group) => group.repo)

    expect(repos).toEqual(['a/one', 'c/three', 'b/two'])
  })
})

describe('getEventCategories', () => {
  it('offers only categories that narrow the list', () => {
    expect(getEventCategories(events)).toEqual([
      { value: 'pull-requests', label: 'Pull requests' },
      { value: 'issues', label: 'Issues' },
      { value: 'code', label: 'Code' },
    ])
  })

  it('offers nothing when one category holds every event', () => {
    const onlyPullRequests = events.filter((e) => e.type === 'pull-request')

    expect(getEventCategories(onlyPullRequests)).toEqual([])
  })
})

describe('filterByCategory', () => {
  it('keeps the events in the category', () => {
    const types = filterByCategory(events, 'pull-requests').map((e) => e.type)

    expect(types).toEqual(['pull-request', 'pull-request', 'pull-request'])
  })

  it('counts comments on a pull request as pull requests', () => {
    const prComment = event(
      'IssueCommentEvent',
      'a/one',
      '2026-10-07T10:00:00Z',
      {
        issue: { number: 1, pull_request: {} },
      },
    )
    const issueComment = event(
      'IssueCommentEvent',
      'a/one',
      '2026-10-07T10:00:00Z',
      {
        issue: { number: 2 },
      },
    )

    expect(
      filterByCategory([prComment, issueComment], 'pull-requests'),
    ).toEqual([prComment])
    expect(filterByCategory([prComment, issueComment], 'issues')).toEqual([
      issueComment,
    ])
  })

  it('keeps everything without a category', () => {
    expect(filterByCategory(events)).toBe(events)
  })
})

describe('summarizeEvents', () => {
  it('counts events and names the most frequent types', () => {
    expect(summarizeEvents(events.slice(0, 4))).toBe(
      '4 events · pull requests, comments',
    )
  })

  it('uses the singular for one event', () => {
    expect(summarizeEvents(events.slice(0, 1))).toBe('1 event · pull requests')
  })

  it('trails off after three types', () => {
    expect(summarizeEvents(events)).toBe(
      '6 events · pull requests, comments, forks, …',
    )
  })
})

describe('getEventTypeLabel', () => {
  it('uses a readable label, falling back to the bare type', () => {
    expect(getEventTypeLabel('pull-request')).toBe('pull requests')
    expect(getEventTypeLabel('SomethingNewEvent')).toBe('somethingnew')
  })
})

/** `count` events of one type, an hour apart from `start`. */
function repeat(
  type: string,
  count: number,
  start = '2026-10-01T00:00:00Z',
  repo = 'a/one',
  payload?: Record<string, unknown>,
): RepoEvent[] {
  return Array.from({ length: count }, (_, i) =>
    event(
      type,
      repo,
      new Date(Date.parse(start) + i * 3_600_000).toISOString(),
      payload,
    ),
  )
}

describe('summarizeEventTypes', () => {
  it('puts the most frequent type first, breaking ties by most recent', () => {
    const types = summarizeEventTypes(events)

    expect(types.map(({ type, count }) => [type, count])).toEqual([
      ['pull-request', 3],
      ['push', 1],
      ['fork', 1],
      ['issue-comment', 1],
    ])
  })

  it('counts shares, distinct repositories and the newest event', () => {
    const [pullRequests, push] = summarizeEventTypes(events)

    expect(pullRequests).toEqual({
      key: 'pull-request',
      type: 'pull-request',
      label: 'other pull request updates',
      count: 3,
      share: 0.5,
      repoCount: 2,
      newestAt: '2026-10-04T10:00:00Z',
    })
    expect(push?.repoCount).toBe(0)
  })
})

describe('summarizeEventTypes pull requests', () => {
  it('splits pull requests into opened, merged, closed and other updates', () => {
    const list = [
      ...repeat('PullRequestEvent', 4, undefined, undefined, {
        action: 'opened',
      }),
      ...repeat('PullRequestEvent', 3, undefined, undefined, {
        action: 'merged',
      }),
      ...repeat('PullRequestEvent', 2, undefined, undefined, {
        action: 'closed',
      }),
      ...repeat('PullRequestEvent', 1, undefined, undefined, {
        action: 'labeled',
      }),
    ]

    expect(
      summarizeEventTypes(list).map(({ key, label, count }) => [
        key,
        label,
        count,
      ]),
    ).toEqual([
      ['pull-request:opened', 'opened pull requests', 4],
      ['pull-request:merged', 'merged pull requests', 3],
      ['pull-request:closed', 'closed pull requests', 2],
      ['pull-request', 'other pull request updates', 1],
    ])
  })

  it('counts older closed events with merged set as merged', () => {
    const list = repeat('PullRequestEvent', 2, undefined, undefined, {
      action: 'closed',
      pull_request: { merged: true },
    })

    expect(summarizeEventTypes(list).map(({ key }) => key)).toEqual([
      'pull-request:merged',
    ])
  })
})

describe('formatEventShare', () => {
  it('rounds to a whole percentage', () => {
    expect(formatEventShare(0.456)).toBe('46%')
    expect(formatEventShare(1)).toBe('100%')
  })

  it('shows tiny shares as under one percent', () => {
    expect(formatEventShare(0.004)).toBe('<1%')
    expect(formatEventShare(0)).toBe('0%')
  })
})

describe('getEventSpanDays', () => {
  it('measures the days between the oldest and newest event', () => {
    expect(getEventSpanDays(events)).toBe(5)
  })

  it('is zero for a single event', () => {
    expect(getEventSpanDays(events.slice(0, 1))).toBe(0)
  })
})

describe('describeActivityBreakdown', () => {
  const opened = { action: 'opened' }

  function describeEvents(list: RepoEvent[]): string {
    return describeActivityBreakdown(
      summarizeEventTypes(list),
      getEventSpanDays(list),
    )
  }

  it('names the top type with its share and a common second type', () => {
    const list = [
      ...repeat('PullRequestEvent', 6, '2026-10-01T00:00:00Z', 'a/one', opened),
      ...repeat('IssueCommentEvent', 3, '2026-10-10T00:00:00Z'),
      event('PushEvent', 'a/one', '2026-10-24T00:00:00Z'),
    ]

    expect(describeEvents(list)).toBe(
      'Mostly opened pull requests (60%) and comments, over 23 days',
    )
  })

  it('leaves out a second type under 15%', () => {
    const list = [
      ...repeat('PullRequestEvent', 6, undefined, undefined, opened),
      ...repeat('IssueCommentEvent', 1),
      ...repeat('PushEvent', 1),
    ]

    expect(describeEvents(list)).toBe(
      'Mostly opened pull requests (75%), within a day',
    )
  })

  it('names a second type at exactly 15%', () => {
    const list = [
      ...repeat('PullRequestEvent', 17, undefined, undefined, opened),
      ...repeat('IssueCommentEvent', 3),
    ]

    expect(describeEvents(list)).toBe(
      'Mostly opened pull requests (85%) and comments, within a day',
    )
  })

  it('says when every event is the same type', () => {
    const list = [
      ...repeat('PushEvent', 37),
      event('PushEvent', 'a/one', '2026-10-04T00:00:00Z'),
    ]

    expect(describeEvents(list)).toBe('All 38 events are pushes, over 3 days')
  })

  it('describes activity within a day', () => {
    expect(describeEvents(repeat('PushEvent', 5))).toBe(
      'All 5 events are pushes, within a day',
    )
  })

  it('leaves out percentages with fewer than five events', () => {
    const list = [
      ...repeat('PullRequestEvent', 3, undefined, undefined, opened),
      ...repeat('IssueCommentEvent', 1),
    ]

    expect(describeEvents(list)).toBe(
      'Mostly opened pull requests and comments, within a day',
    )
  })

  it('handles one or two events', () => {
    expect(describeEvents(repeat('PushEvent', 1))).toBe(
      'A single event: pushes',
    )
    expect(describeEvents(repeat('PushEvent', 2))).toBe(
      'Both events are pushes, within a day',
    )
  })

  it('is empty without events', () => {
    expect(describeActivityBreakdown([], 0)).toBe('')
  })
})
