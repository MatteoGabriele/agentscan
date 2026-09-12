/// <reference types="node" />
/**
 * Stage approved automation entries on a branch through the GitHub API.
 *
 * main is protected, so approvals cannot be committed to it directly. Nothing
 * is cloned or pushed from the runner: the list is read from main, the new
 * entries are appended in memory, and the result is written back as a single
 * file commit on a branch of its own, which is then opened as a pull request
 * for a maintainer to merge.
 *
 * One run, one branch, one pull request, always cut from main's tip — there is
 * no branch to keep in sync and no open pull request to append to. Nothing
 * here recovers from a failure either: the caller only closes the issues once
 * staging has landed, so a failed run leaves every report open and the next
 * scheduled run stages them again from scratch.
 */

import type { Octokit } from 'octokit'
import type { AutomationEntry } from '../parse-automation-issue'

export const LIST_PATH = 'data/verified-automations-list.json'

export interface Repository {
  owner: string
  repo: string
  /** Branch this run stages its approvals on. Must not exist yet. */
  branch: string
  /** Branch the approvals are ultimately merged into. */
  base: string
}

export interface StageResult {
  /** Entries written to the branch by this run. */
  added: AutomationEntry[]
  /** Usernames that were already on the list. */
  alreadyListed: string[]
  /** The pull request holding the entries, or null when nothing was added. */
  pull: { number: number } | null
}

/** How the list is written to disk, matching what prettier produces. */
export function serializeList(entries: AutomationEntry[]): string {
  return JSON.stringify(entries, null, 2) + '\n'
}

/**
 * GitHub logins are case-insensitive, so the list is deduped that way too — a
 * report for `SomeBot` must not add a second entry next to `somebot`.
 */
const key = (entry: AutomationEntry | string): string =>
  (typeof entry === 'string' ? entry : entry.username).toLowerCase()

/**
 * Splits `incoming` against the list as it stands. The set grows as it goes, so
 * two reports for the same account in one run add one entry and the second is
 * reported as already listed.
 */
export function split(
  list: AutomationEntry[],
  incoming: AutomationEntry[],
): { added: AutomationEntry[]; alreadyListed: string[] } {
  const listed = new Set(list.map(key))
  const added: AutomationEntry[] = []
  const alreadyListed: string[] = []

  for (const entry of incoming) {
    if (listed.has(key(entry))) {
      alreadyListed.push(entry.username)
      continue
    }

    listed.add(key(entry))
    added.push(entry)
  }

  return { added, alreadyListed }
}

/**
 * Adds `incoming` to a branch of its own and opens a pull request for it,
 * deduped against the list on main.
 *
 * Only main is deduped against. The report behind an entry waiting in an
 * earlier, still-open pull request was closed when that pull request was
 * opened, so it is never counted twice — but a *second* report for the same
 * account would be, and staging it here would add the account again. Merging
 * the open pull request is what closes that window.
 */
export async function stageApprovals(
  octokit: Octokit,
  { owner, repo, branch, base }: Repository,
  incoming: AutomationEntry[],
  { message, title, body }: { message: string; title: string; body: string },
): Promise<StageResult> {
  const { data: file } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: LIST_PATH,
    ref: base,
  })

  if (!('content' in file)) {
    throw new Error(`${LIST_PATH} did not come back as a file`)
  }

  const list = JSON.parse(
    Buffer.from(file.content, 'base64').toString('utf-8'),
  ) as AutomationEntry[]

  const { added, alreadyListed } = split(list, incoming)

  if (added.length === 0) {
    return { added, alreadyListed, pull: null }
  }

  const { data: tip } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${base}`,
  })

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: tip.object.sha,
  })

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: LIST_PATH,
    branch,
    message,
    // The blob being replaced. The branch is at the tip this sha was read
    // from, so a stale sha means main moved mid-run and the call is rejected
    // rather than overwriting it.
    sha: file.sha,
    content: Buffer.from(serializeList([...list, ...added])).toString('base64'),
  })

  const { data: pull } = await octokit.rest.pulls.create({
    owner,
    repo,
    head: branch,
    base,
    title,
    body,
  })

  return { added, alreadyListed, pull: { number: pull.number } }
}
