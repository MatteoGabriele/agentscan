import { describe, it, expect } from 'vitest'
import {
  truncate,
  openedMessage,
  decidedMessage,
  digestMessages,
  votersLine,
  type PendingReport,
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

  // The verdict is posted with SUPPRESS_EMBEDS too, but a run settling several
  // reports would still stack preview cards if the link were left bare.
  it('wraps the issue link so Discord shows no preview card', () => {
    const message = decidedMessage(report, decision(), thresholds)

    expect(message).toContain(`<${report.url}>`)
    expect(message).not.toContain(`\n${report.url}`)
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

const pending = (overrides: Partial<PendingReport> = {}): PendingReport => ({
  issue: 42,
  url: 'https://github.com/MatteoGabriele/agentscan/issues/42',
  username: 'kaigritun',
  approvals: 2,
  rejections: 0,
  approvedBy: ['alice', 'bob'],
  rejectedBy: [],
  ...overrides,
})

describe('votersLine', () => {
  it('lists who voted which way', () => {
    const line = votersLine(
      pending({ approvedBy: ['alice', 'bob'], rejectedBy: ['carol'] }),
    )

    expect(line).toContain('👍 `alice, bob`')
    expect(line).toContain('👎 `carol`')
  })

  it('leaves out a side nobody has taken', () => {
    const line = votersLine(pending({ approvedBy: ['alice'], rejectedBy: [] }))

    expect(line).toContain('👍 `alice`')
    expect(line).not.toContain('👎')
  })

  it('says so when nobody has voted yet', () => {
    const line = votersLine(pending({ approvedBy: [], rejectedBy: [] }))

    expect(line).toContain('nobody has voted yet')
  })

  // Names are a roster, not a summons: no @ means Discord pings no one.
  it('does not tag the reviewers it names', () => {
    const line = votersLine(
      pending({ approvedBy: ['alice'], rejectedBy: ['carol'] }),
    )

    expect(line).not.toContain('@')
  })
})

describe('digestMessages', () => {
  it('posts nothing when no report is pending', () => {
    expect(digestMessages([], thresholds)).toEqual([])
  })

  it('lists the account, both tallies and the issue link', () => {
    const [message] = digestMessages([pending()], thresholds)

    expect(message).toContain('`@kaigritun`')
    expect(message).toContain('👍 2/4')
    expect(message).toContain('👎 0/2')
    expect(message).toContain(
      '<https://github.com/MatteoGabriele/agentscan/issues/42>',
    )
  })

  // A preview card per entry would bury the list, so every link is wrapped in
  // <>. The digest is posted with SUPPRESS_EMBEDS too, but the formatting alone
  // has to be enough.
  it('leaves no bare link that Discord would unfurl into a preview', () => {
    const messages = digestMessages(
      [pending({ issue: 1 }), pending({ issue: 2 }), pending({ issue: 3 })],
      thresholds,
    )

    for (const message of messages) {
      expect(message).not.toMatch(/[^<]https?:\/\//)
      expect(message).not.toMatch(/https?:\/\/\S*[^>\s]$/m)
    }
  })

  it('lists who has voted under each report', () => {
    const [message] = digestMessages(
      [pending({ approvedBy: ['alice', 'bob'], rejectedBy: ['carol'] })],
      thresholds,
    )

    const lines = message.split('\n')
    const entry = lines.findIndex((line) => line.includes('`@kaigritun`'))

    // The entry runs: account, tally, roster, link.
    expect(lines[entry + 1]).toContain('👍 2/4')
    expect(lines[entry + 2]).toContain('👍 `alice, bob`')
    expect(lines[entry + 2]).toContain('👎 `carol`')
    expect(lines[entry + 3]).toContain('<https://')
  })

  // The split moves whole reports, so no message can open with a roster whose
  // report was left at the end of the previous one.
  it('never separates a roster from the report it belongs to', () => {
    const many = Array.from({ length: 120 }, (_, index) =>
      pending({
        issue: index,
        username: `automation-account-${index}`,
        approvedBy: ['alice', 'bob'],
      }),
    )

    const messages = digestMessages(many, thresholds)
    expect(messages.length).toBeGreaterThan(1)

    for (const message of messages) {
      const lines = message.split('\n')

      lines.forEach((line, index) => {
        if (line.includes('`@automation-account-')) {
          expect(lines[index + 2]).toContain('👍 `alice, bob`')
          expect(lines[index + 3]).toContain('<https://')
        }

        if (line.startsWith('> voted by')) {
          expect(lines[index - 2]).toContain('`@automation-account-')
        }
      })
    }
  })

  // The old flat list ran every report together, which was unreadable in the
  // channel: each entry now stands as its own block.
  it('separates the reports with a blank line', () => {
    const [message] = digestMessages(
      [
        pending({ issue: 1, username: 'first' }),
        pending({ issue: 2, username: 'second' }),
      ],
      thresholds,
    )

    const lines = message.split('\n')
    const second = lines.findIndex((line) => line.includes('`@second`'))

    expect(lines[second - 1]).toBe('')
  })

  it('keeps the reports in the order it was given', () => {
    const [message] = digestMessages(
      [
        pending({ issue: 7, username: 'older' }),
        pending({ issue: 9, username: 'newer' }),
      ],
      thresholds,
    )

    expect(message.indexOf('older')).toBeLessThan(message.indexOf('newer'))
  })

  it('counts the backlog in the footer, and reads right for one report', () => {
    const [one] = digestMessages([pending()], thresholds)
    expect(one).toContain('1 report is still open.')

    const [several] = digestMessages(
      [pending({ issue: 1 }), pending({ issue: 2 })],
      thresholds,
    )
    expect(several).toContain('2 reports are still open.')
  })

  it('fits a single message when the backlog is small', () => {
    expect(
      digestMessages([pending(), pending({ issue: 43 })], thresholds),
    ).toHaveLength(1)
  })

  // Discord drops anything past 2000 characters, so a long backlog has to span
  // several messages rather than lose its tail.
  it('splits a long backlog into messages that each fit the limit', () => {
    const many = Array.from({ length: 120 }, (_, index) =>
      pending({ issue: index, username: `automation-account-${index}` }),
    )

    const messages = digestMessages(many, thresholds)

    expect(messages.length).toBeGreaterThan(1)
    for (const message of messages) {
      expect(message.length).toBeLessThanOrEqual(2000)
    }
  })

  it('lists every pending report across the split', () => {
    const many = Array.from({ length: 120 }, (_, index) =>
      pending({ issue: index, username: `automation-account-${index}` }),
    )

    const combined = digestMessages(many, thresholds).join('\n')

    for (const report of many) {
      expect(combined).toContain(`\`@${report.username}\``)
    }
  })
})
