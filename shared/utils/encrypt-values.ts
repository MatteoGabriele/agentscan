import { createCipheriv, createDecipheriv, createHash } from 'crypto'

function deriveKey(): Buffer {
  const secret = process.env.PR_HASH_SECRET
  if (!secret) {
    throw new Error('PR_HASH_SECRET environment variable is required')
  }

  return createHash('sha256').update(secret).digest()
}

export function encryptValue(...parts: (string | number)[]): string {
  for (const part of parts) {
    if (typeof part === 'number' && !Number.isFinite(part)) {
      throw new Error(`Invalid value: ${part}`)
    }
  }

  const cipher = createCipheriv('aes-256-ecb', deriveKey(), null)

  return cipher.update(parts.join(':'), 'utf-8', 'hex') + cipher.final('hex')
}

export function decryptValue(encrypted: string): string {
  if (!/^[0-9a-f]+$/.test(encrypted) || encrypted.length % 32 !== 0) {
    throw new Error('Invalid encrypted value')
  }

  const decipher = createDecipheriv('aes-256-ecb', deriveKey(), null)

  try {
    return decipher.update(encrypted, 'hex', 'utf-8') + decipher.final('utf-8')
  } catch {
    throw new Error(
      'Invalid encrypted value: wrong secret, or not a ciphertext',
    )
  }
}

export function decryptParts(encrypted: string): string[] {
  return decryptValue(encrypted).split(':')
}
