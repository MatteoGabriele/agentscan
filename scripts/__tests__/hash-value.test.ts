import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { hashValue } from '../hash-value'

beforeEach(() => {
  vi.stubEnv('PR_HASH_SECRET', 'test-secret')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('hashValue', () => {
  it('is deterministic, so a later scan matches the row it already wrote', () => {
    expect(hashValue(12345)).toBe(hashValue(12345))
  })

  it('keeps different values distinct', () => {
    expect(hashValue(12345)).not.toBe(hashValue(12346))
  })

  it('never shows the value in the output', () => {
    const salted = hashValue(12345)

    expect(salted).not.toContain('12345')
    expect(salted).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces a different output under a different secret', () => {
    const salted = hashValue(12345)

    vi.stubEnv('PR_HASH_SECRET', 'a-different-secret')

    expect(hashValue(12345)).not.toBe(salted)
  })

  it('joins compound keys with a colon', () => {
    expect(hashValue('acme/lib', 42)).toBe(hashValue('acme/lib:42'))
  })

  it('keeps compound keys distinct from each other', () => {
    expect(hashValue('acme/lib', 42)).not.toBe(hashValue('acme/other', 42))
    expect(hashValue('acme/lib', 42)).not.toBe(hashValue('acme/lib', 43))
  })

  it('refuses a value that is not a finite number', () => {
    expect(() => hashValue(Number.NaN)).toThrow('Invalid value')
    expect(() => hashValue(Number.POSITIVE_INFINITY)).toThrow('Invalid value')
    expect(() => hashValue('acme/lib', Number.NaN)).toThrow('Invalid value')
  })

  it('refuses to run without the secret', () => {
    vi.stubEnv('PR_HASH_SECRET', '')

    expect(() => hashValue(12345)).toThrow('PR_HASH_SECRET')
  })
})
