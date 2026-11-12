import { describe, expect, it } from 'vitest'
import { findPendingReport, toPendingReports } from './pending-reports'

function issue(number: number, username: string, overrides = {}) {
  return {
    number,
    html_url: `https://github.com/o/r/issues/${number}`,
    title: `[AUTOMATION] ${username}`,
    ...overrides,
  }
}

describe('toPendingReports', () => {
  it('reads the reported username, newest first', () => {
    expect(
      toPendingReports([issue(10, 'Bot-Account'), issue(20, '@other')]),
    ).toEqual([
      {
        username: 'other',
        number: 20,
        url: 'https://github.com/o/r/issues/20',
      },
      {
        username: 'bot-account',
        number: 10,
        url: 'https://github.com/o/r/issues/10',
      },
    ])
  })

  it('skips pull requests and issues without a username', () => {
    expect(
      toPendingReports([
        issue(1, 'bot', { pull_request: {} }),
        issue(2, ''),
        issue(3, '', { title: 'Some other issue' }),
        issue(4, '', { title: '[AUTOMATION] two words' }),
      ]),
    ).toEqual([])
  })
})

describe('findPendingReport', () => {
  const reports = toPendingReports([issue(5, 'bot'), issue(9, 'bot')])

  it('matches case-insensitively and returns the newest', () => {
    expect(findPendingReport(reports, 'BOT')?.number).toBe(9)
  })

  it('returns nothing for unknown or missing usernames', () => {
    expect(findPendingReport(reports, 'bott')).toBeUndefined()
    expect(findPendingReport(reports, undefined)).toBeUndefined()
    expect(findPendingReport(null, 'bot')).toBeUndefined()
  })
})
