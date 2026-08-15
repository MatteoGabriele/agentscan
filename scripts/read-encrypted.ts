/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decryptValue } from './encrypt-value'

// Every ciphertext this repo writes is hex in whole 16-byte blocks. Anything
// else in the file — a login, a date, a count — is left alone.
function looksEncrypted(value: string): boolean {
  return /^[0-9a-f]+$/.test(value) && value.length % 32 === 0
}

function reveal(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reveal)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, reveal(val)]),
    )
  }

  if (typeof value === 'string' && looksEncrypted(value)) {
    try {
      return decryptValue(value)
    } catch {
      // Rows written under an older secret, or under the HMAC this replaced,
      // stay in the file and cannot be read back. Flag them, don't fail.
      return `<unreadable ${value.slice(0, 12)}…>`
    }
  }

  return value
}

function main(args: string[]) {
  const target = args[0]

  if (!target) {
    console.error('Usage: read-encrypted.ts <data-file.json | ciphertext>')
    process.exit(1)
  }

  if (looksEncrypted(target)) {
    console.log(decryptValue(target))
    return
  }

  const filePath = target.includes('/') ? target : join('data', target)
  const parsed = JSON.parse(readFileSync(filePath, 'utf-8'))

  console.log(JSON.stringify(reveal(parsed), null, 2))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv.slice(2))
  } catch (err) {
    console.error('Error:', (err as Error).message)
    process.exit(1)
  }
}
