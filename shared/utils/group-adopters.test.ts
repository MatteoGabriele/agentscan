import { describe, expect, it } from 'vitest'
import type { AdopterRepository } from '../types/adopter-repository'
import {
  groupAdoptersByOwner,
  repositoryNameWithoutOwner,
} from './group-adopters'

function repository(
  name: string,
  stars = 0,
  avatar = `${name.split('/')[0]}.png`,
): AdopterRepository {
  return { name, stars, avatar, url: `https://github.com/${name}` }
}

describe('groupAdoptersByOwner', () => {
  it('returns nothing for an empty list', () => {
    expect(groupAdoptersByOwner([])).toEqual([])
  })

  it('merges the repositories of an owner into a single group', () => {
    const groups = groupAdoptersByOwner([
      repository('nuxt/nuxt', 60808),
      repository('nuxt/ui', 5000),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ owner: 'nuxt', avatar: 'nuxt.png' })
    expect(groups[0]?.repositories.map((item) => item.name)).toEqual([
      'nuxt/nuxt',
      'nuxt/ui',
    ])
  })

  it('keeps owners with a single repository', () => {
    const groups = groupAdoptersByOwner([repository('nodejs/node', 119975)])

    expect(groups).toEqual([
      {
        owner: 'nodejs',
        avatar: 'nodejs.png',
        repositories: [repository('nodejs/node', 119975)],
      },
    ])
  })

  it('orders owners by their most starred repository, not by their total', () => {
    const groups = groupAdoptersByOwner([
      repository('vitejs/vite', 82621),
      repository('nuxt/nuxt', 60808),
      repository('nuxt/ui', 30000),
    ])

    expect(groups.map((group) => group.owner)).toEqual(['vitejs', 'nuxt'])
  })

  it('puts the most starred repository of a group first', () => {
    const groups = groupAdoptersByOwner([
      repository('biomejs/website', 2),
      repository('biomejs/biome', 90000),
      repository('biomejs/tools', 5),
    ])

    expect(groups[0]?.repositories.map((item) => item.name)).toEqual([
      'biomejs/biome',
      'biomejs/tools',
      'biomejs/website',
    ])
  })

  it('orders a group by its most starred repository, whatever order it came in', () => {
    const groups = groupAdoptersByOwner([
      repository('biomejs/website', 2),
      repository('vitejs/vite', 82621),
      repository('biomejs/biome', 90000),
    ])

    expect(groups.map((group) => group.owner)).toEqual(['biomejs', 'vitejs'])
  })

  it('breaks ties by owner name so the order never wobbles', () => {
    const groups = groupAdoptersByOwner([
      repository('zoe/one', 10),
      repository('adam/one', 10),
    ])

    expect(groups.map((group) => group.owner)).toEqual(['adam', 'zoe'])
  })

  it('orders the repositories of a group by stars, then by name', () => {
    const groups = groupAdoptersByOwner([
      repository('nuxt/image', 1000),
      repository('nuxt/nuxt', 60808),
      repository('nuxt/fonts', 1000),
    ])

    expect(groups[0]?.repositories.map((item) => item.name)).toEqual([
      'nuxt/nuxt',
      'nuxt/fonts',
      'nuxt/image',
    ])
  })

  it('keeps a name without an owner as a row of its own', () => {
    const groups = groupAdoptersByOwner([repository('node', 10)])

    expect(groups.map((group) => group.owner)).toEqual(['node'])
  })

  it('skips an empty name', () => {
    expect(groupAdoptersByOwner([repository('', 10)])).toEqual([])
  })
})

describe('repositoryNameWithoutOwner', () => {
  it('drops the owner the group already shows', () => {
    expect(repositoryNameWithoutOwner(repository('nuxt/ui'), 'nuxt')).toBe('ui')
  })

  it('leaves a name that does not start with the owner alone', () => {
    expect(repositoryNameWithoutOwner(repository('nuxt/ui'), 'vite')).toBe(
      'nuxt/ui',
    )
  })
})
