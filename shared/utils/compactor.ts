/// <reference types="node" />

import type { EcosystemHealthItem } from '../types/ecosystem-health'

// Compact CSV format for scan results — ~72% smaller than pretty-printed JSON.
//
// Line 0:  REPOS:<comma-separated repo names>   (index lookup)
// Lines 1+: <created_ts>,<score>,<pr_key_b64url>,<status>,<user_ts>,<repos>,<events>,<repo_idx>,<is_bounty>
//
//   created_ts / user_ts : unix seconds (drops sub-second precision)
//   pr_key               : base64url, no padding  (64 hex → 43 chars)
//   status               : "o" = open | "c" = closed
//   repo_idx             : index into the REPOS header
//   is_bounty            : 1 = bounty hunter | 0 = not

const STATUS_ENCODE: Record<string, string> = { open: 'o', closed: 'c' }
const STATUS_DECODE: Record<string, string> = { o: 'open', c: 'closed' }

function hexToBase64Url(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64url')
}

function base64UrlToHex(b64: string): string {
  return Buffer.from(b64, 'base64url').toString('hex')
}

function toUnixSecs(isoDate: string): number {
  return Math.floor(new Date(isoDate).getTime() / 1000)
}

function fromUnixSecs(secs: number): string {
  return new Date(secs * 1000).toISOString()
}

export function pack(results: EcosystemHealthItem[]): string {
  const repoList: string[] = []
  const repoIndex = new Map<string, number>()

  for (const r of results) {
    if (!repoIndex.has(r.repo_name)) {
      repoIndex.set(r.repo_name, repoList.length)
      repoList.push(r.repo_name)
    }
  }

  const lines: string[] = [`REPOS:${repoList.join(',')}`]

  for (const r of results) {
    lines.push(
      [
        toUnixSecs(r.created_at),
        r.score,
        hexToBase64Url(r.pr_key),
        STATUS_ENCODE[r.pr_status] ?? r.pr_status,
        toUnixSecs(r.user_created_at),
        r.user_public_repos_count,
        r.events_count,
        repoIndex.get(r.repo_name),
        r.is_bounty ? 1 : 0,
      ].join(','),
    )
  }

  return lines.join('\n')
}

export function unpack(content: string): EcosystemHealthItem[] {
  const lines = content.split('\n')
  if (!lines[0]?.startsWith('REPOS:')) {
    return []
  }

  const repos = lines[0].slice(6).split(',').filter(Boolean)
  const results: EcosystemHealthItem[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line?.trim()) {
      continue
    }

    const fields = line.split(',')
    const [
      createdTs,
      score,
      prKeyB64,
      status,
      userCreatedTs,
      publicRepos,
      events,
      repoIdx,
      isBounty,
    ] = fields

    if (fields.length < 8) {
      continue
    }

    const numCreatedTs = Number(createdTs)
    const numUserCreatedTs = Number(userCreatedTs)
    const numPublicRepos = Number(publicRepos)
    const numEvents = Number(events)
    const numRepoIdx = Number(repoIdx)

    if (
      !Number.isFinite(numCreatedTs) ||
      !Number.isFinite(numUserCreatedTs) ||
      !Number.isFinite(numPublicRepos) ||
      !Number.isFinite(numEvents) ||
      !Number.isFinite(numRepoIdx)
    ) {
      continue
    }

    results.push({
      created_at: fromUnixSecs(numCreatedTs),
      score: Number(score),
      pr_key: base64UrlToHex(prKeyB64!),
      pr_status: STATUS_DECODE[status!] ?? status!,
      user_created_at: fromUnixSecs(numUserCreatedTs),
      user_public_repos_count: numPublicRepos,
      events_count: numEvents,
      repo_name: repos[numRepoIdx] ?? '',
      is_bounty: isBounty === '1',
    })
  }

  return results
}
