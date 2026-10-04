/// <reference types="node" />
/**
 * Drop the entries whose GitHub account is gone from data/verified-automations-list.json.
 *
 * Accounts on the list get deleted, renamed, or suspended after they are
 * reported, and a stale entry either points at nothing or — once the login is
 * taken by somebody else — at the wrong person. Run it by hand every now and
 * then with `pnpm prune:automations` and commit the file.
 *
 * Both halves of an entry are checked, because either one alone lies:
 *   - the login alone: a deleted login is free for anyone to claim, so the name
 *     can resolve to an account that was never reported
 *   - the id alone: it survives a rename, so the entry keeps pointing at a live
 *     account under a name the list no longer spells right
 *
 * Only entries whose id is gone are removed. A rename is reported and left
 * alone: the account is still there, so the entry is a name to fix by hand, not
 * a report to drop. GitHub answers 404 for suspended accounts too, so an account
 * it has taken down counts as gone.
 *
 * Credentials come from .env:
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
 * `byLogin` is the answer for the entry's username, `byId` the answer for its
 * id — both null when GitHub returned 404. `byId` may be left undefined when
 * the login lookup already confirmed the entry, which is the common case and
 * saves the second request.
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

  // The id is gone. Whoever answers to the login now is not the account that
  // was reported, so the entry has to go either way.
  return byLogin ? { state: 'reclaimed', id: byLogin.id } : { state: 'gone' }
}

export const isGone = ({ status }: Check): boolean =>
  status.state === 'gone' || status.state === 'reclaimed'

/** A 404 is an answer; anything else is a broken run and must not prune. */
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

  // One at a time: the list is small, and a burst of lookups is the one way a
  // read-only token runs into a secondary rate limit.
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

  // Every account gone at once is a broken lookup, not a mass deletion, so the
  // committed file is left alone.
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

// Guarded so importing a helper from here — the tests do — does not prune.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exit(1)
  })
}
