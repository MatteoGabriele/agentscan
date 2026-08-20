import type { GitHubEvent, IdentifyFlag } from '@unveil/identity'
import { describe, expect, it } from 'vitest'
import { buildEvidenceLines, buildReportIssueUrl } from './report-issue'

const makeFlag = (overrides: Partial<IdentifyFlag> = {}): IdentifyFlag => ({
  label: 'Test Flag',
  points: 10,
  detail: 'Test detail',
  data: [],
  events: [],
  ...overrides,
})

const makePrEvent = (
  repoName: string,
  number: number,
  htmlUrl?: string,
): GitHubEvent =>
  ({
    type: 'PullRequestEvent',
    repo: { name: repoName },
    payload: {
      pull_request: {
        number,
        ...(htmlUrl ? { html_url: htmlUrl } : {}),
      },
    },
  }) as unknown as GitHubEvent

describe('buildReportIssueUrl', () => {
  it('points at the report-automated-account issue template on the real agentscan repo', () => {
    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: 123,
        flags: [makeFlag()],
        sourceUrl: 'https://github.com/owner/repo/pull/1',
      }),
    )

    expect(url.origin + url.pathname).toBe(
      'https://github.com/matteogabriele/agentscan/issues/new',
    )
    expect(url.searchParams.get('template')).toBe(
      'report-automated-account.yml',
    )
    expect(url.searchParams.get('title')).toBe('[AUTOMATION] bot-account')
    expect(url.searchParams.get('username')).toBe('bot-account')
    expect(url.searchParams.get('user-id')).toBe('123')
  })

  it('omits user-id when it is unknown', () => {
    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: undefined,
        flags: [makeFlag()],
        sourceUrl: 'https://github.com/owner/repo/pull/1',
      }),
    )

    expect(url.searchParams.has('user-id')).toBe(false)
  })

  it('includes the source link plus each flag label and detail in the evidence', () => {
    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: 123,
        flags: [
          makeFlag({
            label: 'Fork surge',
            detail: '12 forks in 24h',
            points: 51,
          }),
          makeFlag({
            label: 'PR burst',
            detail: '20 PRs in a day',
            points: 45,
          }),
        ],
        sourceUrl: 'https://github.com/owner/repo/pull/1',
      }),
    )

    const evidence = url.searchParams.get('evidence') ?? ''
    expect(evidence).toContain('https://redirect.github.com/owner/repo/pull/1')
    expect(evidence).toContain('Fork surge: 12 forks in 24h')
    expect(evidence).toContain('PR burst: 20 PRs in a day')
  })

  it('rewrites the source github.com link to redirect.github.com to avoid an unwanted backlink on the flagged PR', () => {
    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: 123,
        flags: [makeFlag()],
        sourceUrl: 'https://github.com/owner/repo/pull/1',
      }),
    )

    const evidence = url.searchParams.get('evidence') ?? ''
    expect(evidence).not.toContain('https://github.com/')
    expect(evidence).toContain('https://redirect.github.com/owner/repo/pull/1')
  })

  it('leaves non-github.com source URLs untouched', () => {
    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: 123,
        flags: [makeFlag()],
        sourceUrl: 'https://gitlab.example.com/owner/repo/-/merge_requests/1',
      }),
    )

    const evidence = url.searchParams.get('evidence') ?? ''
    expect(evidence).toContain(
      'https://gitlab.example.com/owner/repo/-/merge_requests/1',
    )
  })

  it('caps the evidence list to the highest-scoring flags and notes the remainder', () => {
    const flags = Array.from({ length: 10 }, (_, index) =>
      makeFlag({
        label: `Flag ${index}`,
        detail: `Detail ${index}`,
        points: index,
      }),
    )

    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: 123,
        flags,
        sourceUrl: 'https://github.com/owner/repo/pull/1',
      }),
    )

    const evidence = url.searchParams.get('evidence') ?? ''
    // Highest-points flags (9 down to 2) should be included...
    expect(evidence).toContain('Flag 9: Detail 9')
    expect(evidence).toContain('Flag 2: Detail 2')
    // ...lowest-points flags should be dropped, with a note on how many.
    expect(evidence).not.toContain('Flag 0: Detail 0')
    expect(evidence).not.toContain('Flag 1: Detail 1')
    expect(evidence).toContain('+2 more signal(s)')
  })

  it('lists example PRs derived from the flags underlying events, rewritten to avoid backlinks', () => {
    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: 123,
        flags: [
          makeFlag({
            events: [
              makePrEvent(
                'owner/repo1',
                10,
                'https://github.com/owner/repo1/pull/10',
              ),
              // No html_url on the raw event: falls back to repo + number.
              makePrEvent('owner/repo2', 20),
            ],
          }),
        ],
        sourceUrl: 'https://github.com/owner/repo/pull/1',
      }),
    )

    const evidence = url.searchParams.get('evidence') ?? ''
    expect(evidence).toContain('Last 2 PRs:')
    expect(evidence).toContain(
      'https://redirect.github.com/owner/repo1/pull/10',
    )
    expect(evidence).toContain(
      'https://redirect.github.com/owner/repo2/pull/20',
    )
  })

  it('dedupes example PRs across flags and caps the list at 5', () => {
    const events = Array.from({ length: 4 }, (_, index) =>
      makePrEvent(`owner/repo${index + 1}`, index + 1),
    )
    const duplicateEvent = makePrEvent('owner/repo1', 1)

    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: 123,
        flags: [
          makeFlag({ events }),
          makeFlag({
            events: [
              duplicateEvent,
              makePrEvent('owner/repo5', 5),
              makePrEvent('owner/repo6', 6),
            ],
          }),
        ],
        sourceUrl: 'https://github.com/owner/repo/pull/1',
      }),
    )

    const evidence = url.searchParams.get('evidence') ?? ''
    expect(evidence).toContain('Last 5 PRs:')
    const prLines = evidence
      .split('\n')
      .filter((line) => line.startsWith('- https://redirect.github.com'))
    expect(prLines).toHaveLength(5)
    expect(evidence).not.toContain('owner/repo6')
  })

  it('omits the example PRs section when flags carry no PR events', () => {
    const url = new URL(
      buildReportIssueUrl({
        username: 'bot-account',
        userId: 123,
        flags: [makeFlag({ events: [] })],
        sourceUrl: 'https://github.com/owner/repo/pull/1',
      }),
    )

    const evidence = url.searchParams.get('evidence') ?? ''
    expect(evidence).not.toContain('PRs:')
  })
})

describe('buildEvidenceLines', () => {
  it('omits the "Flagged in" line when no sourceUrl is given', () => {
    const lines = buildEvidenceLines({ flags: [makeFlag()] })

    expect(lines.some((line) => line.startsWith('- Flagged in:'))).toBe(false)
  })

  it('includes the "Flagged in" line, rewritten to avoid a backlink, when sourceUrl is given', () => {
    const lines = buildEvidenceLines({
      flags: [makeFlag()],
      sourceUrl: 'https://github.com/owner/repo/pull/1',
    })

    expect(lines[0]).toBe(
      '- Flagged in: https://redirect.github.com/owner/repo/pull/1',
    )
  })
})
