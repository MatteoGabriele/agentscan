import { describe, expect, it } from 'vitest'
import { isKnownBot } from '../../../shared/cicd-known-bots'

describe('isKnownBot', () => {
  it('returns true for usernames matching a known bot name', () => {
    expect(isKnownBot('dependabot')).toBe(true)
    expect(isKnownBot('renovate')).toBe(true)
    expect(isKnownBot('github-actions')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isKnownBot('Dependabot')).toBe(true)
    expect(isKnownBot('RENOVATE')).toBe(true)
  })

  it('returns true when username contains a known bot name as a substring', () => {
    expect(isKnownBot('dependabot[bot]')).toBe(true)
    expect(isKnownBot('app/dependabot')).toBe(true)
  })

  it('returns true for usernames ending with [bot]', () => {
    expect(isKnownBot('some-unknown-service[bot]')).toBe(true)
    expect(isKnownBot('custom-ci[bot]')).toBe(true)
  })

  it('returns false for regular user accounts', () => {
    expect(isKnownBot('matteo')).toBe(false)
    expect(isKnownBot('john-doe')).toBe(false)
    expect(isKnownBot('alice123')).toBe(false)
  })
})
