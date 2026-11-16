import { describe, it, expect } from 'vitest'
import {
  formatContributorDiff,
  isHumanContributor,
  mergeContributors,
} from '../lib/contributors'
import type { Contributor, Repository } from '../../shared/types/contributor'

const person = (
  id: number,
  name: string,
  contributions: number,
): Contributor => ({
  id,
  name,
  avatar: `https://avatars.githubusercontent.com/u/${id}?v=4&s=50`,
  url: `https://github.com/${name}`,
  contributions,
})

const repository = (repo: string, contributors: Contributor[]): Repository => ({
  repo,
  label: repo,
  url: `https://github.com/owner/${repo}`,
  contributors,
})

describe('mergeContributors', () => {
  it('sums contributions for the same person across repositories', () => {
    const merged = mergeContributors([
      repository('a', [person(1, 'ada', 10), person(2, 'bob', 3)]),
      repository('b', [person(1, 'ada', 5)]),
    ])

    expect(merged).toEqual([person(1, 'ada', 15), person(2, 'bob', 3)])
  })

  it('leaves the per-repository entries untouched', () => {
    const repositories = [
      repository('a', [person(1, 'ada', 10)]),
      repository('b', [person(1, 'ada', 5)]),
    ]

    mergeContributors(repositories)

    expect(repositories[0]?.contributors[0]?.contributions).toBe(10)
  })

  it('breaks ties by name, so an unchanged run produces no diff', () => {
    const merged = mergeContributors([
      repository('a', [person(2, 'zed', 4), person(1, 'amy', 4)]),
    ])

    expect(merged.map((item) => item.name)).toEqual(['amy', 'zed'])
  })
})

describe('isHumanContributor', () => {
  const account = (login: string, type = 'User') => ({
    id: 1,
    login,
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    type,
    contributions: 1,
  })

  it('keeps users', () => {
    expect(isHumanContributor(account('ada'))).toBe(true)
  })

  it('drops bots and the Actions committer', () => {
    expect(isHumanContributor(account('renovate[bot]', 'Bot'))).toBe(false)
    expect(isHumanContributor(account('actions-user'))).toBe(false)
  })

  it('drops anonymous entries without a login', () => {
    expect(isHumanContributor({ type: 'Anonymous', contributions: 1 })).toBe(
      false,
    )
  })
})

describe('formatContributorDiff', () => {
  it('reports no change', () => {
    const list = [person(1, 'ada', 1)]

    expect(formatContributorDiff(list, list)).toBe('= No new contributors (1)')
  })

  it('lists new people', () => {
    expect(
      formatContributorDiff(
        [person(1, 'ada', 1)],
        [person(1, 'ada', 2), person(3, 'cy', 1)],
      ),
    ).toBe('Δ +1 new (1 → 2)\n  + cy')
  })
})
