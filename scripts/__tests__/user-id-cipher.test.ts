import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encryptUserId, decryptUserId } from '../user-id-cipher'

const SECRET = 'test-secret'

beforeEach(() => {
  vi.stubEnv('PR_HASH_SECRET', SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('encryptUserId / decryptUserId', () => {
  it('brings the id back under the same key', () => {
    expect(decryptUserId(encryptUserId(12345))).toBe(12345)
  })

  it('round-trips ids across the range GitHub actually issues', () => {
    for (const id of [1, 42, 258667664, Number.MAX_SAFE_INTEGER]) {
      expect(decryptUserId(encryptUserId(id))).toBe(id)
    }
  })

  it('is deterministic, so a later scan matches the row it already wrote', () => {
    expect(encryptUserId(12345)).toBe(encryptUserId(12345))
  })

  it('keeps different accounts distinct', () => {
    expect(encryptUserId(12345)).not.toBe(encryptUserId(12346))
  })

  it('never shows the id in the token', () => {
    const token = encryptUserId(12345)

    expect(token).not.toContain('12345')
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('is unreadable under a different secret', () => {
    const token = encryptUserId(12345)

    vi.stubEnv('PR_HASH_SECRET', 'a-different-secret')

    expect(() => decryptUserId(token)).toThrow()
  })

  it('produces a different token under a different secret', () => {
    const token = encryptUserId(12345)

    vi.stubEnv('PR_HASH_SECRET', 'a-different-secret')

    expect(encryptUserId(12345)).not.toBe(token)
  })

  it('rejects a tampered token instead of decrypting it to nonsense', () => {
    const raw = Buffer.from(encryptUserId(12345), 'base64url')
    raw[raw.length - 1] ^= 0xff

    expect(() => decryptUserId(raw.toString('base64url'))).toThrow()
  })

  it('rejects a token too short to hold a nonce and tag', () => {
    expect(() => decryptUserId('c2hvcnQ')).toThrow(
      'Invalid automation id token',
    )
  })

  it('refuses to encrypt a non-integer id', () => {
    expect(() => encryptUserId(1.5)).toThrow('Invalid userId')
    expect(() => encryptUserId(Number.NaN)).toThrow('Invalid userId')
  })

  it('refuses to run without the secret', () => {
    // Well-formed, so it is the missing secret that stops the read rather than
    // the length guard in front of it.
    const token = encryptUserId(12345)

    vi.stubEnv('PR_HASH_SECRET', '')

    expect(() => encryptUserId(12345)).toThrow('PR_HASH_SECRET')
    expect(() => decryptUserId(token)).toThrow('PR_HASH_SECRET')
  })
})
