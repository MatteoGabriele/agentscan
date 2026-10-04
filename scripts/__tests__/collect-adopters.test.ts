import { describe, it, expect } from 'vitest'
import { mergeAdopters } from '../collect-adopters'
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
    expect(merged[0].avatar).toBe('app-avatar')
    expect(merged[0].platform).toBe('app')
  })

  it('returns an empty list when nothing was collected', () => {
    expect(mergeAdopters([], [])).toEqual([])
  })
})
