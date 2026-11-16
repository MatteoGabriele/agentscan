/// <reference types="node" />
/**
 * Removes entries from data/verified-automations-list.json whose GitHub account
 * no longer exists. Run with `pnpm prune:automations` and commit the file.
 *
 * Each entry is looked up by login and by id:
 *   - id gone (deleted or suspended): removed, even if someone else now holds
 *     the login
 *   - id alive under another login: a rename, reported to fix by hand
 *
 * Credentials from .env:
 *   NUXT_GITHUB_TOKEN   any token that may read public users
 */

import { Octokit } from 'octokit'
import type { AutomationEntry } from './parse-automation-issue'
import { LIST_PATH, readList, writeList } from './lib/automations-list'
import { readGithubToken } from './lib/github-token'

/** What the two lookups say about one entry. */
export type Status =
  /** The login resolves and it is the reported account. */
  | { state: 'listed' }
  /** The account is alive under a different login — the entry's name is stale. */
  | { state: 'renamed'; login: string }
  /** The account is gone and somebody else holds the login now. */
  | { state: 'reclaimed'; id: number }
  /** Neither the login nor the id resolves. */
  | { state: 'gone' }

export type Check = { entry: AutomationEntry; status: Status }

type ByLogin = { id: number } | null
type ById = { login: string } | null

const sameLogin = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/**
 * `byLogin` and `byId` are the lookups for the entry's username and id (null on
 * 404). `byId` is undefined when the login lookup already confirmed the entry.
 */
export function classify(
  entry: AutomationEntry,
  byLogin: ByLogin,
  byId?: ById,
): Status {
  if (byLogin && byLogin.id === entry.id) {
    return { state: 'listed' }
  }

  if (byId) {
    return sameLogin(byId.login, entry.username)
      ? { state: 'listed' }
      : { state: 'renamed', login: byId.login }
  }

  // The id is gone, so the entry is removed whoever holds the login now.
  return byLogin ? { state: 'reclaimed', id: byLogin.id } : { state: 'gone' }
}

export const isGone = ({ status }: Check): boolean =>
  status.state === 'gone' || status.state === 'reclaimed'

/** Returns null on 404 and rethrows any other error, so a failed run never prunes. */
async function lookup<T>(request: () => Promise<T>): Promise<T | null> {
  try {
    return await request()
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      return null
    }

    throw error
  }
}

async function check(
  octokit: Octokit,
  entry: AutomationEntry,
): Promise<Status> {
  const byLogin = await lookup(async () => {
    const { data } = await octokit.rest.users.getByUsername({
      username: entry.username,
    })
    return { id: data.id }
  })

  if (byLogin && byLogin.id === entry.id) {
    return classify(entry, byLogin)
  }

  const byId = await lookup(async () => {
    const { data } = await octokit.rest.users.getById({ account_id: entry.id })
    return { login: data.login }
  })

  return classify(entry, byLogin, byId)
}

function report({ entry, status }: Check): void {
  switch (status.state) {
    case 'renamed':
      console.log(
        `⚠ @${entry.username} (${entry.id}) now goes by @${status.login} — kept, fix the name by hand (${entry.issueUrl})`,
      )
      break
    case 'reclaimed':
      console.log(
        `✗ @${entry.username} (${entry.id}) is gone — the login belongs to account ${status.id} now (${entry.issueUrl})`,
      )
      break
    case 'gone':
      console.log(
        `✗ @${entry.username} (${entry.id}) no longer exists (${entry.issueUrl})`,
      )
      break
  }
}

async function main() {
  const dryRun = process.argv.slice(2).includes('--dry-run')

  const octokit = new Octokit({ auth: readGithubToken() })
  const list = readList()

  console.log(`📋 Checking ${list.length} entr(y/ies) against GitHub\n`)

  const checks: Check[] = []

  // Sequential lookups avoid GitHub's secondary rate limit.
  for (const entry of list) {
    checks.push({ entry, status: await check(octokit, entry) })
  }

  for (const result of checks) {
    report(result)
  }

  const removed = checks.filter(isGone)
  const kept = checks.filter((result) => !isGone(result))

  console.log(
    `\n${kept.length} of ${list.length} entr(y/ies) still exist, ${removed.length} to remove`,
  )

  if (removed.length === 0) {
    console.log('Nothing to prune')
    return
  }

  // Every account gone at once means the lookups failed; leave the file alone.
  if (removed.length === list.length && list.length > 1) {
    console.error(
      '✗ Every entry looked gone — that is a broken run, leaving the file untouched',
    )
    process.exit(1)
  }

  if (dryRun) {
    console.log(`\nDry run: ${LIST_PATH} not written`)
    return
  }

  writeList(kept.map((result) => result.entry))
  console.log(`\nRemoved ${removed.length} entr(y/ies) from ${LIST_PATH}`)
  console.log('Commit it on a branch and open a pull request to publish.')
}

// Runs only when executed directly, not when imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
