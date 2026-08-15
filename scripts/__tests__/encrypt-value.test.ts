import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encryptValue, decryptValue, decryptParts } from '../encrypt-value'

beforeEach(() => {
  vi.stubEnv('PR_HASH_SECRET', 'test-secret')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('encryptValue', () => {
  it('is deterministic, so a later scan matches the row it already wrote', () => {
    expect(encryptValue(12345)).toBe(encryptValue(12345))
  })

  it('keeps different values distinct', () => {
    expect(encryptValue(12345)).not.toBe(encryptValue(12346))
  })

  it('never shows the value in the output', () => {
    const encrypted = encryptValue(12345)

    expect(encrypted).not.toContain('12345')
    expect(encrypted).toMatch(/^[0-9a-f]+$/)
  })

  it('produces a different output under a different secret', () => {
    const encrypted = encryptValue(12345)

    vi.stubEnv('PR_HASH_SECRET', 'a-different-secret')

    expect(encryptValue(12345)).not.toBe(encrypted)
  })

  it('joins compound keys with a colon', () => {
    expect(encryptValue('acme/lib', 42)).toBe(encryptValue('acme/lib:42'))
  })

  it('keeps compound keys distinct from each other', () => {
    expect(encryptValue('acme/lib', 42)).not.toBe(
      encryptValue('acme/other', 42),
    )
    expect(encryptValue('acme/lib', 42)).not.toBe(encryptValue('acme/lib', 43))
  })

  it('refuses a value that is not a finite number', () => {
    expect(() => encryptValue(Number.NaN)).toThrow('Invalid value')
    expect(() => encryptValue(Number.POSITIVE_INFINITY)).toThrow(
      'Invalid value',
    )
    expect(() => encryptValue('acme/lib', Number.NaN)).toThrow('Invalid value')
  })

  it('refuses to run without the secret', () => {
    vi.stubEnv('PR_HASH_SECRET', '')

    expect(() => encryptValue(12345)).toThrow('PR_HASH_SECRET')
  })
})

describe('decryptValue', () => {
  it('reads the original value back out', () => {
    expect(decryptValue(encryptValue(12345))).toBe('12345')
    expect(decryptValue(encryptValue('acme/lib'))).toBe('acme/lib')
  })

  it('round-trips a compound key', () => {
    expect(decryptValue(encryptValue('acme/lib', 42))).toBe('acme/lib:42')
    expect(decryptParts(encryptValue('acme/lib', 42))).toEqual([
      'acme/lib',
      '42',
    ])
  })

  it('round-trips a value long enough to span cipher blocks', () => {
    const long = 'a'.repeat(500)

    expect(decryptValue(encryptValue(long))).toBe(long)
  })

  it('refuses a value encrypted under a different secret', () => {
    const encrypted = encryptValue(12345)

    vi.stubEnv('PR_HASH_SECRET', 'a-different-secret')

    expect(() => decryptValue(encrypted)).toThrow('Invalid encrypted value')
  })

  it('refuses a tampered value rather than returning garbage', () => {
    const encrypted = encryptValue(12345)
    const flipped = `${encrypted.slice(0, -1)}${encrypted.at(-1) === 'a' ? 'b' : 'a'}`

    expect(() => decryptValue(flipped)).toThrow('Invalid encrypted value')
  })

  it('refuses input that was never a ciphertext', () => {
    expect(() => decryptValue('not-hex')).toThrow('Invalid encrypted value')
    expect(() => decryptValue('abcdef')).toThrow('Invalid encrypted value')
  })

  it('refuses to run without the secret', () => {
    const encrypted = encryptValue(12345)

    vi.stubEnv('PR_HASH_SECRET', '')

    expect(() => decryptValue(encrypted)).toThrow('PR_HASH_SECRET')
  })
})
