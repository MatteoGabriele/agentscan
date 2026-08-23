import { describe, it, expect } from 'vitest'
import { decide, parseReviewers, type Tally } from '../review-automation-issues'

const config = {
  reviewers: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  minApprovals: 5,
  minRejections: 3,
}

const tally = (approvals: number, rejections: number): Tally => ({
  approvals,
  rejections,
  approvedBy: [],
  rejectedBy: [],
})

describe('parseReviewers', () => {
  it('splits on newlines and commas', () => {
    expect(parseReviewers('a\nb, c')).toEqual(['a', 'b', 'c'])
  })

  it('strips @ and lowercases', () => {
    expect(parseReviewers('@MatteoGabriele')).toEqual(['matteogabriele'])
  })

  it('drops duplicates and empties', () => {
    expect(parseReviewers('a\n\na, A ,')).toEqual(['a'])
  })

  it('handles an undefined value', () => {
    expect(parseReviewers(undefined)).toEqual([])
  })
})

describe('decide', () => {
  it('stays pending below both thresholds', () => {
    expect(decide(tally(4, 2), config)).toBe('pending')
  })

  it('approves once the minimum is reached', () => {
    expect(decide(tally(5, 0), config)).toBe('approved')
  })

  it('rejects on the minimum rejections', () => {
    expect(decide(tally(2, 3), config)).toBe('rejected')
  })

  it('rejects once the approvals can no longer be reached', () => {
    // 6 reviewers, 5 needed, 2 rejections → at most 4 approvals left.
    expect(
      decide(tally(1, 2), {
        ...config,
        reviewers: ['a', 'b', 'c', 'd', 'e', 'f'],
        minRejections: 4,
      }),
    ).toBe('rejected')
  })

  it('lets approvals win a tie against the rejection threshold', () => {
    expect(decide(tally(5, 3), config)).toBe('approved')
  })
})
