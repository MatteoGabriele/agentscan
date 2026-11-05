import { describe, expect, it } from 'vitest'
import type { GitHubEvent } from '@unveil/identity/providers/github'
import {
  filterByCategory,
  getEventCategories,
  getEventTypeLabel,
  groupEventsByRepo,
  summarizeEvents,
} from './repo-activity'

function event(
  type: string,
  repo: string | undefined,
  at: string,
): GitHubEvent {
  return {
    type,
    created_at: at,
    repo: repo ? { name: repo } : undefined,
  } as GitHubEvent
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

    expect(busiest?.events.map((e) => e.created_at)).toEqual([
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
    const onlyPullRequests = events.filter((e) => e.type === 'PullRequestEvent')

    expect(getEventCategories(onlyPullRequests)).toEqual([])
  })
})

describe('filterByCategory', () => {
  it('keeps the events in the category', () => {
    const types = filterByCategory(events, 'pull-requests').map((e) => e.type)

    expect(types).toEqual([
      'PullRequestEvent',
      'PullRequestEvent',
      'PullRequestEvent',
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
    expect(getEventTypeLabel('PullRequestEvent')).toBe('pull requests')
    expect(getEventTypeLabel('SponsorshipEvent')).toBe('sponsorship')
  })
})
