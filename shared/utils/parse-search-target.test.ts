import { describe, expect, it } from 'vitest'
import { parseScanPath, parseSearchTarget } from './parse-search-target'

describe('parseSearchTarget', () => {
  it.each(['', '   ', '/', '@', 'two words'])('rejects %j', (input) => {
    expect(parseSearchTarget(input)).toBeNull()
  })

  it.each([
    ['torvalds', 'torvalds'],
    ['  Torvalds ', 'torvalds'],
    ['@torvalds', 'torvalds'],
    ['https://github.com/torvalds', 'torvalds'],
    ['github.com/torvalds/', 'torvalds'],
    ['https://www.github.com/torvalds?tab=repositories', 'torvalds'],
  ])('reads %j as an account', (input, name) => {
    expect(parseSearchTarget(input)).toEqual({ kind: 'account', name })
  })

  it.each([
    'nuxt/nuxt',
    'https://github.com/nuxt/nuxt',
    'https://github.com/nuxt/nuxt.git',
    'https://github.com/nuxt/nuxt/pull/123',
    'github.com/nuxt/nuxt#readme',
  ])('reads %j as a repository', (input) => {
    expect(parseSearchTarget(input)).toEqual({
      kind: 'repository',
      owner: 'nuxt',
      repo: 'nuxt',
      path: 'nuxt/nuxt',
    })
  })
})

describe('parseScanPath', () => {
  it('reads one segment as an account', () => {
    expect(parseScanPath('vuejs')).toEqual({ kind: 'account', name: 'vuejs' })
  })

  it.each([
    'vuejs/core',
    'https://github.com/vuejs/core',
    'https:/github.com/vuejs/core',
    'github.com/vuejs/core/pull/123',
  ])('reads %j as a repository', (path) => {
    expect(parseScanPath(path)).toEqual({
      kind: 'repository',
      owner: 'vuejs',
      repo: 'core',
      path: 'vuejs/core',
    })
  })

  it.each(['', 'vuejs/core/pulls', 'a/b/c/d'])('rejects %j', (path) => {
    expect(parseScanPath(path)).toBeNull()
  })
})
