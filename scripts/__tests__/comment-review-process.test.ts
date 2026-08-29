import { describe, it, expect } from 'vitest'
import { MARKER, reviewProcessComment } from '../comment-review-process'
import type { Thresholds } from '../review-automation-issues'

const thresholds: Thresholds = { minApprovals: 4, minRejections: 2 }

describe('reviewProcessComment', () => {
  it('leads with the marker that keeps a re-run from posting twice', () => {
    expect(reviewProcessComment(thresholds).startsWith(MARKER)).toBe(true)
  })

  it('spells out both thresholds', () => {
    const body = reviewProcessComment(thresholds)

    expect(body).toContain('**4 👍 — flagged.**')
    expect(body).toContain('**2 👎 — rejected.**')
  })

  it('follows the configured thresholds rather than hardcoding them', () => {
    const body = reviewProcessComment({ minApprovals: 5, minRejections: 3 })

    expect(body).toContain('**5 👍 — flagged.**')
    expect(body).toContain('**3 👎 — rejected.**')
    expect(body).toContain('make 5 👍 impossible')
  })

  it('says that only the review team is counted', () => {
    expect(reviewProcessComment(thresholds)).toContain(
      '**Only reactions from the review team are counted.**',
    )
  })

  it('points reviewers at the issue rather than at the comments', () => {
    expect(reviewProcessComment(thresholds)).toContain('**issue itself**')
  })

  it('keeps every paragraph on one line, so GitHub does not break it', () => {
    const prose = reviewProcessComment(thresholds)
      .split('\n')
      .filter((line) => line && !line.startsWith('-') && line !== MARKER)

    // A wrapped paragraph shows up as a short line that does not end a sentence.
    for (const line of prose) {
      expect(line.length < 60 || /[.:]$/.test(line)).toBe(true)
    }
  })
})
