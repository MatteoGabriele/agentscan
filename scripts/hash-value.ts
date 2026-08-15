/// <reference types="node" />

import { createHmac } from 'crypto'

/**
 * Stable, pseudonymous stand-in for a value that must not appear verbatim in a
 * public JSON file — a PR number, a GitHub account id — while still letting a
 * scan six weeks from now find the row it wrote today.
 *
 * An HMAC keyed with the shared secret, not a salted hash: the secret is one
 * key held back from the published file, rather than a public per-record value.
 * That is what stops the output being unmasked by hashing every candidate id
 * GitHub has issued, and it is why rotating the secret invalidates every row
 * already written.
 *
 * Deterministic by design, which leaks equality: two identical outputs mean the
 * same input. That is exactly what the scan records, and no more than the
 * counters beside it already say.
 *
 * Multiple parts are joined with `:` so callers can hash a compound key without
 * assembling the string themselves.
 */
export function hashValue(...parts: (string | number)[]): string {
  const secret = process.env.PR_HASH_SECRET
  if (!secret) {
    throw new Error('PR_HASH_SECRET environment variable is required')
  }

  for (const part of parts) {
    // A NaN or Infinity would otherwise hash to a stable value, quietly
    // collapsing every broken row onto the same key.
    if (typeof part === 'number' && !Number.isFinite(part)) {
      throw new Error(`Invalid value: ${part}`)
    }
  }

  return createHmac('sha256', secret).update(parts.join(':')).digest('hex')
}
