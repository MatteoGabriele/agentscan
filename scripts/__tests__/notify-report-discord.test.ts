import { describe, it, expect } from 'vitest'
import {
  truncate,
  openedMessage,
  decidedMessage,
  type ReportSummary,
  type Thresholds,
} from '../notify-report-discord'
import type { Decision } from '../review-automation-issues'

const report: ReportSummary = {
  issue: 42,
  url: 'https://github.com/MatteoGabriele/agentscan/issues/42',
  username: 'kaigritun',
  reportedBy: 'reporter',
  reason: 'Self-disclosed as an AI agent',
}

const thresholds: Thresholds = { minApprovals: 4, minRejections: 2 }

const decision = (overrides: Partial<Decision> = {}): Decision => ({
  issue: 42,
  outcome: 'approved',
  approvals: 4,
  rejections: 0,
  approvedBy: ['alice', 'bob', 'carol', 'dave'],
  rejectedBy: [],
  ...overrides,
})

describe('truncate', () => {
  it('leaves a short reason alone', () => {
    expect(truncate('Short reason', 300)).toBe('Short reason')
  })

  it('trims surrounding whitespace', () => {
    expect(truncate('  padded  ', 300)).toBe('padded')
  })

  it('cuts an over-long reason to the limit, ellipsis included', () => {
    const result = truncate('a'.repeat(400), 10)
    expect(result).toHaveLength(10)
    expect(result.endsWith('…')).toBe(true)
  })

  it('does not leave a dangling space before the ellipsis', () => {
    expect(truncate('one two three', 8)).toBe('one two…')
  })
})

describe('openedMessage', () => {
  it('names the account, the reporter and the issue', () => {
    const message = openedMessage(report)

    expect(message).toContain('New automation report')
    expect(message).toContain('@kaigritun')
    expect(message).toContain('@reporter')
    expect(message).toContain(report.url)
  })

  it('quotes the reason', () => {
    expect(openedMessage(report)).toContain('> Self-disclosed as an AI agent')
  })

  it('stays inside the Discord message limit on a long reason', () => {
    const message = openedMessage({ ...report, reason: 'x'.repeat(5000) })
    expect(message.length).toBeLessThan(2000)
  })
})

describe('decidedMessage', () => {
  it('announces an approval and the entry that was added', () => {
    const message = decidedMessage(report, decision(), thresholds)

    expect(message).toContain('Report approved')
    expect(message).toContain('has been added to the automation list')
    expect(message).toContain(report.url)
  })

  it('says nothing was added when the account was already listed', () => {
    const message = decidedMessage(
      report,
      decision({ alreadyListed: true }),
      thresholds,
    )

    expect(message).toContain('was already on the automation list')
    expect(message).not.toContain('has been added')
  })

  it('announces a rejection', () => {
    const message = decidedMessage(
      report,
      decision({ outcome: 'rejected', approvals: 1, rejections: 2 }),
      thresholds,
    )

    expect(message).toContain('Report not flagged')
    expect(message).toContain('was not flagged')
  })

  it('shows the tally against the configured thresholds', () => {
    expect(decidedMessage(report, decision(), thresholds)).toContain(
      '👍 4/4  ·  👎 0/2',
    )
  })

  // The reviewers who voted are already named in the issue comment; the channel
  // post deliberately keeps to the counts.
  it('does not name the reviewers who voted', () => {
    const message = decidedMessage(report, decision(), thresholds)

    expect(message).not.toContain('alice')
    expect(message).not.toContain('bob')
  })
})
