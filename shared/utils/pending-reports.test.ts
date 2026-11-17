import { describe, expect, it } from 'vitest'
import { findPendingReport, toPendingReports } from './pending-reports'

function issue(number: number, username: string, overrides = {}) {
  return {
    number,
    html_url: `https://github.com/o/r/issues/${number}`,
    title: '[AUTOMATION] ',
    body: `### GitHub Username\n\n${username}\n\n### GitHub User ID\n\n1\n`,
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

  it('reads the body even when the title names someone else', () => {
    expect(
      toPendingReports([issue(7, 'bot', { title: '[AUTOMATION] other' })]),
    ).toEqual([
      { username: 'bot', number: 7, url: 'https://github.com/o/r/issues/7' },
    ])
  })

  it('skips pull requests and issues without a username', () => {
    expect(
      toPendingReports([
        issue(1, 'bot', { pull_request: {} }),
        issue(2, ''),
        issue(3, '', { body: 'Some other issue' }),
        issue(4, 'two words'),
        issue(5, '', { body: null }),
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
