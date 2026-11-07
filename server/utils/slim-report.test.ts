import { describe, expect, it } from 'vitest'
import type { GitHubEvent } from '@unveil/identity/providers/github'
import type { Report } from '@unveil/identity/report'
import { slimGitHubEvent, slimReport, withoutEvidence } from './slim-report'

const pullRequestEvent = {
  id: '1',
  type: 'PullRequestEvent',
  created_at: '2026-10-01T10:00:00Z',
  actor: { login: 'someone', avatar_url: 'https://example.com/a.png' },
  repo: { id: 1, name: 'owner/repo', url: 'https://api.github.com/repos/x' },
  payload: {
    action: 'opened',
    number: 42,
    pull_request: { number: 42, body: 'x'.repeat(5000), head: {} },
  },
} as GitHubEvent

describe('slimGitHubEvent', () => {
  it('marks comments made on a pull request', () => {
    const comment = {
      type: 'IssueCommentEvent',
      created_at: '2026-10-01T10:00:00Z',
      payload: {
        issue: {
          number: 7,
          pull_request: { url: 'https://x', merged_at: null },
        },
      },
    } as GitHubEvent

    expect(slimGitHubEvent(comment).payload).toEqual({
      issue: { number: 7, pull_request: {} },
    })
  })

  it('keeps the fields the account page reads', () => {
    expect(slimGitHubEvent(pullRequestEvent)).toEqual({
      type: 'PullRequestEvent',
      created_at: '2026-10-01T10:00:00Z',
      repo: { name: 'owner/repo' },
      payload: { action: 'opened', pull_request: { number: 42 } },
    })
  })

  it('drops payload objects that have nothing to keep', () => {
    const slim = slimGitHubEvent(pullRequestEvent)
    expect(JSON.stringify(slim)).not.toContain('issue')
  })

  it('counts commits when a push event has no size', () => {
    const push = {
      type: 'PushEvent',
      created_at: '2026-10-01T10:00:00Z',
      payload: { ref: 'refs/heads/main', commits: [{}, {}], head: 'abc' },
    } as GitHubEvent

    expect(slimGitHubEvent(push).payload).toEqual({
      ref: 'refs/heads/main',
      head: 'abc',
      size: 2,
    })
  })

  it('keeps comment ids and fork names for links', () => {
    const comment = {
      type: 'IssueCommentEvent',
      created_at: '2026-10-01T10:00:00Z',
      payload: {
        action: 'created',
        issue: { number: 7, title: 'Bug', body: 'long' },
        comment: { id: 99, body: 'long' },
      },
    } as GitHubEvent

    expect(slimGitHubEvent(comment).payload).toEqual({
      action: 'created',
      issue: { number: 7 },
      comment: { id: 99 },
    })
  })
})

function reportWithEvidence(): Report {
  const activity = {
    type: 'pr-opened',
    at: '2026-10-01T10:00:00Z',
    repo: 'owner/repo',
    source: pullRequestEvent,
  }

  return {
    flags: [
      {
        id: 'pr-burst',
        events: [activity],
        connections: [{ from: activity, to: activity, label: 'fast' }],
      },
    ],
  } as unknown as Report
}

describe('slimReport', () => {
  it('slims the source of flag events and connections', () => {
    const [flag] = slimReport(reportWithEvidence()).flags

    expect(flag?.events[0]?.source).toEqual(slimGitHubEvent(pullRequestEvent))
    expect(flag?.connections?.[0]?.from.source).toEqual(
      slimGitHubEvent(pullRequestEvent),
    )
    expect(flag?.connections?.[0]?.label).toBe('fast')
  })
})

describe('withoutEvidence', () => {
  it('drops flag events and connections but keeps the flag', () => {
    const [flag] = withoutEvidence(reportWithEvidence()).flags

    expect(flag?.id).toBe('pr-burst')
    expect(flag?.events).toEqual([])
    expect(flag?.connections).toBeUndefined()
  })
})
