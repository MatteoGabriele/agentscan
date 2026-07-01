/// <reference types="node" />

import { createHmac } from 'crypto'

export function hashPrId(repo: string, prId: number): string {
  const secret = process.env.PR_HASH_SECRET
  if (!secret) {
    throw new Error('PR_HASH_SECRET environment variable is required')
  }
  if (!Number.isFinite(prId)) {
    throw new Error(`Invalid prId: ${prId}`)
  }
  return createHmac('sha256', secret).update(`${repo}:${prId}`).digest('hex')
}
