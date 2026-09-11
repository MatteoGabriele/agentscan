import { describe, expect, it } from 'vitest'
import { parseRepoSlug } from './parse-repo-slug'

describe('parseRepoSlug', () => {
  it('parses a bare slug', () => {
    expect(parseRepoSlug('vuejs/core')).toEqual({
      owner: 'vuejs',
      repo: 'core',
      path: 'vuejs/core',
    })
  })

  it('trims surrounding whitespace', () => {
    expect(parseRepoSlug('  vuejs/core  ')?.path).toBe('vuejs/core')
  })

  it('accepts a trailing slash', () => {
    expect(parseRepoSlug('vuejs/core/')?.path).toBe('vuejs/core')
  })

  it.each([
    'https://github.com/vuejs/core',
    'http://github.com/vuejs/core',
    'https://www.github.com/vuejs/core',
    'github.com/vuejs/core',
    'www.github.com/vuejs/core',
    'https://github.com/vuejs/core.git',
  ])('parses %s', (input) => {
    expect(parseRepoSlug(input)?.path).toBe('vuejs/core')
  })

  it('drops the query string and fragment', () => {
    expect(
      parseRepoSlug('https://github.com/vuejs/core?tab=readme#install')?.path,
    ).toBe('vuejs/core')
  })

  // Reading from the end would scan `pull/123` as if it were a repository.
  it('reads the repository from a deep link, not its trailing path', () => {
    expect(parseRepoSlug('https://github.com/vuejs/core/pull/123')?.path).toBe(
      'vuejs/core',
    )
    expect(parseRepoSlug('vuejs/core/issues/9/comments')?.path).toBe(
      'vuejs/core',
    )
  })

  it('preserves case, so the caller decides how to normalize it', () => {
    expect(parseRepoSlug('MatteoGabriele/AgentScan')).toEqual({
      owner: 'MatteoGabriele',
      repo: 'AgentScan',
      path: 'MatteoGabriele/AgentScan',
    })
  })

  it('accepts the punctuation GitHub allows in a repository name', () => {
    expect(parseRepoSlug('octocat/.github')?.repo).toBe('.github')
    expect(parseRepoSlug('octocat/my_repo.js-2')?.repo).toBe('my_repo.js-2')
  })

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['no separator', 'vuejs'],
    ['owner only', 'vuejs/'],
    ['repo only', '/core'],
  ])('rejects %s', (_label, input) => {
    expect(parseRepoSlug(input)).toBeNull()
  })

  // Each of these used to be accepted and spent a GitHub request to 404.
  it.each([
    ['a space in the owner', 'vue js/core'],
    ['a leading hyphen', '-vuejs/core'],
    ['a trailing hyphen', 'vuejs-/core'],
    ['consecutive hyphens', 'vue--js/core'],
    ['an owner over 39 characters', `${'a'.repeat(40)}/core`],
    ['a repo over 100 characters', `vuejs/${'a'.repeat(101)}`],
    ['punctuation GitHub does not allow', 'vuejs/co~re'],
    ['a traversal segment', 'vuejs/..'],
    ['a single dot repo', 'vuejs/.'],
  ])('rejects %s', (_label, input) => {
    expect(parseRepoSlug(input)).toBeNull()
  })

  // Reading the last two segments turned any forge's URL into a GitHub scan of
  // a same-named repository.
  it('rejects a URL from another host', () => {
    expect(parseRepoSlug('https://gitlab.com/vuejs/core')).toBeNull()
    expect(parseRepoSlug('https://evil.example/vuejs/core')).toBeNull()
  })

  it('rejects a traversal-shaped path', () => {
    expect(parseRepoSlug('../../vuejs/core')).toBeNull()
  })
})
