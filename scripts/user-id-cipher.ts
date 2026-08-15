/// <reference types="node" />

import { createCipheriv, createDecipheriv, createHmac } from 'crypto'

/**
 * Reversible, deterministic ids for the automation tally.
 *
 * The tally must do two things at once: keep raw GitHub ids out of a public
 * JSON file, and still let a scan six weeks from now find the row it wrote
 * today. A hash gives the first and, with a key, so does this — but only
 * encryption gives the id back, so an endpoint holding `PR_HASH_SECRET` can
 * resolve a row to an account without being handed a candidate id first.
 *
 * AES-256-GCM with a *derived* nonce rather than a random one: a random nonce
 * would encrypt the same account to a different token every run, and the tally
 * would never match its own rows. Deriving it from the id keeps the token
 * stable. The usual objection to a fixed nonce — that repeating one across two
 * different plaintexts under the same key breaks GCM — does not apply, since
 * each id derives its own. What determinism does leak is equality: two
 * identical tokens mean the same account. That is precisely what the tally is
 * built to record, and no more than the counter beside it already says.
 *
 * The nonce cannot be re-derived at decrypt time (deriving it needs the id we
 * are trying to recover), so it travels with the token:
 *
 *   base64url( nonce[12] || tag[16] || ciphertext )
 */

const KEY_INFO = 'agentscan:automation-id:key:v1'
const NONCE_INFO = 'agentscan:automation-id:nonce:v1'
const NONCE_BYTES = 12
const TAG_BYTES = 16

function readSecret(): string {
  const secret = process.env.PR_HASH_SECRET
  if (!secret) {
    throw new Error('PR_HASH_SECRET environment variable is required')
  }
  return secret
}

/**
 * A 32-byte key derived from the shared secret rather than the secret itself,
 * which is a passphrase of unknown length and entropy. The `KEY_INFO` label
 * keeps this key distinct from anything else the same secret is used for.
 */
function deriveKey(secret: string): Buffer {
  return createHmac('sha256', secret).update(KEY_INFO).digest()
}

function deriveNonce(secret: string, userId: number): Buffer {
  return createHmac('sha256', secret)
    .update(`${NONCE_INFO}:${userId}`)
    .digest()
    .subarray(0, NONCE_BYTES)
}

/** Encrypts an account id to the opaque token stored in the tally. */
export function encryptUserId(userId: number): string {
  if (!Number.isInteger(userId)) {
    throw new Error(`Invalid userId: ${userId}`)
  }

  const secret = readSecret()
  const cipher = createCipheriv(
    'aes-256-gcm',
    deriveKey(secret),
    deriveNonce(secret, userId),
  )
  const body = Buffer.concat([
    cipher.update(String(userId), 'utf8'),
    cipher.final(),
  ])

  return Buffer.concat([
    deriveNonce(secret, userId),
    cipher.getAuthTag(),
    body,
  ]).toString('base64url')
}

/**
 * Recovers the account id from a token. Throws on a token that was not
 * produced by this key — GCM authenticates, so a truncated, edited, or
 * foreign-keyed token fails loudly instead of decrypting to nonsense.
 */
export function decryptUserId(token: string): number {
  const raw = Buffer.from(token, 'base64url')
  if (raw.length <= NONCE_BYTES + TAG_BYTES) {
    throw new Error('Invalid automation id token')
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveKey(readSecret()),
    raw.subarray(0, NONCE_BYTES),
  )
  decipher.setAuthTag(raw.subarray(NONCE_BYTES, NONCE_BYTES + TAG_BYTES))

  const plain = Buffer.concat([
    decipher.update(raw.subarray(NONCE_BYTES + TAG_BYTES)),
    decipher.final(),
  ]).toString('utf8')

  const userId = Number(plain)
  if (!Number.isInteger(userId)) {
    throw new Error('Invalid automation id token')
  }

  return userId
}
