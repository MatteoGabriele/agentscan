import type { ClassificationLabel } from '@unveil/identity'
import { describe, expect, it } from 'vitest'
import { INSUFFICIENT_DATA_SCORE } from './activity-stats'
import {
  countClassifications,
  getAuthorClassification,
  getPullRequestState,
} from './scan-pull-requests'

describe('getPullRequestState', () => {
  it('returns open for open pull requests', () => {
    expect(getPullRequestState({ state: 'open', merged_at: null })).toBe('open')
  })

  it('returns merged when the pull request has a merge date', () => {
    expect(
      getPullRequestState({
        state: 'closed',
        merged_at: '2026-11-01T10:00:00Z',
      }),
    ).toBe('merged')
  })

  it('returns closed for pull requests closed without merging', () => {
    expect(getPullRequestState({ state: 'closed', merged_at: null })).toBe(
      'closed',
    )
  })
})

describe('getAuthorClassification', () => {
  it('keeps the classification of a scored account', () => {
    expect(
      getAuthorClassification({ score: 82, classification: 'organic' }),
    ).toBe('organic')
  })

  it('maps the insufficient-data score regardless of the label', () => {
    expect(
      getAuthorClassification({
        score: INSUFFICIENT_DATA_SCORE,
        classification: 'automation',
      }),
    ).toBe('insufficient-data')
  })

  it('keeps an insufficient-data label', () => {
    expect(
      getAuthorClassification({
        score: INSUFFICIENT_DATA_SCORE,
        classification: 'insufficient-data',
      }),
    ).toBe('insufficient-data')
  })
})

function row(
  classification: ClassificationLabel,
  communityReported = false,
): { classification: ClassificationLabel; communityReported: boolean } {
  return { classification, communityReported }
}

describe('countClassifications', () => {
  it('counts each classification', () => {
    expect(
      countClassifications([
        row('organic'),
        row('organic'),
        row('mixed'),
        row('automation'),
      ]),
    ).toEqual({
      counts: { organic: 2, mixed: 1, automation: 1 },
      insufficient: 0,
      communityReported: 0,
    })
  })

  it('never counts insufficient data as a classification', () => {
    expect(
      countClassifications([
        row('insufficient-data'),
        row('organic'),
        row('insufficient-data'),
      ]),
    ).toEqual({
      counts: { organic: 1, mixed: 0, automation: 0 },
      insufficient: 2,
      communityReported: 0,
    })
  })

  it('counts community-reported rows apart from their classification', () => {
    expect(
      countClassifications([
        row('organic', true),
        row('automation', true),
        row('insufficient-data', true),
        row('organic'),
      ]),
    ).toEqual({
      counts: { organic: 1, mixed: 0, automation: 0 },
      insufficient: 0,
      communityReported: 3,
    })
  })

  it('returns zero counts for an empty list', () => {
    expect(countClassifications([])).toEqual({
      counts: { organic: 0, mixed: 0, automation: 0 },
      insufficient: 0,
      communityReported: 0,
    })
  })
})
