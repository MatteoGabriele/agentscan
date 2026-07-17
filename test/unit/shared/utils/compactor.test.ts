import { describe, expect, it } from 'vitest'
import { pack, unpack } from '../../../../shared/utils/compactor'
import type { EcosystemHealthItem } from '../../../../shared/types/ecosystem-health'

const ITEMS: EcosystemHealthItem[] = [
  {
    created_at: '2026-05-26T19:27:30.000Z',
    score: 100,
    pr_key: 'a1b2c3d4',
    pr_status: 'open',
    user_created_at: '2017-05-15T12:06:30.000Z',
    user_public_repos_count: 869,
    events_count: 200,
    repo_name: 'nuxt/nuxt',
    is_bounty: false,
  },
  {
    created_at: '2026-05-26T19:27:30.000Z',
    score: 40,
    pr_key: 'e5f6a7b8',
    pr_status: 'closed',
    user_created_at: '2026-05-23T17:48:23.000Z',
    user_public_repos_count: 2,
    events_count: 20,
    repo_name: 'nuxt/nuxt',
    is_bounty: false,
  },
  {
    created_at: '2026-05-26T19:27:30.000Z',
    score: 40,
    pr_key: 'c9d0e1f2',
    pr_status: 'merged',
    user_created_at: '2026-05-23T17:48:23.000Z',
    user_public_repos_count: 2,
    events_count: 20,
    repo_name: 'nuxt/nuxt',
    is_bounty: true,
  },
]

describe('pack / unpack', () => {
  it('round-trips open, closed and merged PR statuses', () => {
    const packed = pack(ITEMS)
    const unpacked = unpack(packed)

    expect(unpacked).toEqual(ITEMS)
  })

  it('encodes merged PRs distinctly from closed PRs', () => {
    const packed = pack(ITEMS)
    const lines = packed.split('\n')

    expect(lines[1]?.split(',')[3]).toBe('o')
    expect(lines[2]?.split(',')[3]).toBe('c')
    expect(lines[3]?.split(',')[3]).toBe('m')
  })
})
