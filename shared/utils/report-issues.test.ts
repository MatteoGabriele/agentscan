import { describe, expect, it } from 'vitest'
import { findReportIssues } from './report-issues'

function issue(number: number, userId: string, overrides = {}) {
  return {
    number,
    html_url: `https://github.com/o/r/issues/${number}`,
    state: 'open',
    labels: ['automation', 'automation:pending'],
    body: [
      '### GitHub Username',
      '',
      'bot-account',
      '',
      '### GitHub User ID',
      '',
      userId,
      '',
      '### Supporting Evidence',
      '',
      '- Opened 40 PRs, see 12345',
    ].join('\n'),
    ...overrides,
  }
}

describe('findReportIssues', () => {
  it('keeps issues reporting the user ID, newest first', () => {
    expect(
      findReportIssues([issue(10, '12345'), issue(20, '12345')], 12345),
    ).toEqual([
      {
        number: 20,
        url: 'https://github.com/o/r/issues/20',
        state: 'open',
        outcome: 'pending',
      },
      {
        number: 10,
        url: 'https://github.com/o/r/issues/10',
        state: 'open',
        outcome: 'pending',
      },
    ])
  })

  it('ignores issues that only mention the ID outside the ID field', () => {
    expect(findReportIssues([issue(30, '999')], 12345)).toEqual([])
    expect(findReportIssues([issue(31, '123456')], 12345)).toEqual([])
    expect(findReportIssues([issue(32, '_No response_')], 12345)).toEqual([])
  })

  it('reads the outcome of closed reports from their labels', () => {
    const outcomes = findReportIssues(
      [
        issue(1, '5', {
          state: 'closed',
          labels: [{ name: 'automation:rejected' }],
        }),
        issue(2, '5', { state: 'closed', labels: ['automation:confirmed'] }),
        issue(3, '5', { state: 'closed', labels: ['automation:approved'] }),
        issue(4, '5', { state: 'closed', labels: ['automation'] }),
      ],
      5,
    ).map((report) => [report.number, report.state, report.outcome])

    expect(outcomes).toEqual([
      [4, 'closed', 'closed'],
      [3, 'closed', 'approved'],
      [2, 'closed', 'approved'],
      [1, 'closed', 'rejected'],
    ])
  })
})
