import { describe, it, expect } from 'vitest'
import {
  diffAdopters,
  formatAdopterDiff,
  mergeAdopters,
} from '../collect-adopters'
import type {
  AdopterPlatform,
  AdopterRepository,
} from '../../shared/types/adopter-repository'

const repository = (
  name: string,
  stars: number,
  avatar = 'https://avatars.githubusercontent.com/u/1?s=50',
  platform: AdopterPlatform = 'action',
): AdopterRepository => ({
  name,
  url: `https://github.com/${name}`,
  stars,
  avatar,
  platform,
})

describe('mergeAdopters', () => {
  it('sorts by stars, descending', () => {
    const merged = mergeAdopters([
      repository('owner/low', 3),
      repository('owner/high', 90),
      repository('owner/mid', 12),
    ])

    expect(merged.map((item) => item.name)).toEqual([
      'owner/high',
      'owner/mid',
      'owner/low',
    ])
  })

  it('breaks ties by name, so an unchanged week produces no diff', () => {
    const merged = mergeAdopters([
      repository('owner/c', 5),
      repository('owner/a', 5),
      repository('owner/b', 5),
    ])

    expect(merged.map((item) => item.name)).toEqual([
      'owner/a',
      'owner/b',
      'owner/c',
    ])
  })

  it('counts a repository running both the action and the app once', () => {
    const merged = mergeAdopters(
      [repository('owner/both', 5, 'action-avatar', 'action')],
      [repository('owner/both', 5, 'app-avatar', 'app')],
    )

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ avatar: 'app-avatar', platform: 'app' })
  })

  it('returns an empty list when nothing was collected', () => {
    expect(mergeAdopters([], [])).toEqual([])
  })
})

describe('diffAdopters', () => {
  it('lists repositories that were added and removed', () => {
    const diff = diffAdopters(
      [repository('owner/kept', 5), repository('owner/gone', 3)],
      [repository('owner/kept', 6), repository('owner/new', 9)],
    )

    expect(diff.gained.map((item) => item.name)).toEqual(['owner/new'])
    expect(diff.lost.map((item) => item.name)).toEqual(['owner/gone'])
  })

  it('treats every repository as gained on the first run', () => {
    const diff = diffAdopters([], [repository('owner/a', 1)])

    expect(diff.gained).toHaveLength(1)
    expect(diff.lost).toEqual([])
  })

  it('ignores a platform switch for the same repository', () => {
    const diff = diffAdopters(
      [repository('owner/a', 1, 'avatar', 'action')],
      [repository('owner/a', 1, 'avatar', 'app')],
    )

    expect(diff).toEqual({ gained: [], lost: [] })
  })
})

describe('formatAdopterDiff', () => {
  it('reports no change', () => {
    expect(formatAdopterDiff(2, 2, { gained: [], lost: [] })).toBe(
      '= No change since the last run (2)',
    )
  })

  it('reports the counts and names of gained and lost repositories', () => {
    const output = formatAdopterDiff(2, 3, {
      gained: [
        repository('owner/new', 9, 'avatar', 'app'),
        repository('owner/other', 1),
      ],
      lost: [repository('owner/gone', 3)],
    })

    expect(output).toBe(
      [
        'Δ +2 gained, -1 lost (2 → 3)',
        '  + owner/new (app, ★ 9)',
        '  + owner/other (action, ★ 1)',
        '  - owner/gone (action, ★ 3)',
      ].join('\n'),
    )
  })
})
