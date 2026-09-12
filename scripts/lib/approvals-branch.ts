/// <reference types="node" />
/**
 * Stage approved automation entries on the approvals branch through the GitHub
 * API.
 *
 * main is protected, so approvals cannot be committed to it directly. Nothing
 * is cloned or pushed from the runner: the list is read, the new entries are
 * appended in memory, and the result is written back as a single file commit.
 *
 * One long-lived branch, one open pull request. While that pull request is
 * open the commit is added on top of the branch, so later approvals are
 * appended to it. Once it is merged (or closed) the branch is reset to main and
 * the next approval starts a fresh pull request, which is what keeps the branch
 * from ever falling behind main.
 */

import type { Octokit } from 'octokit'
import type { AutomationEntry } from '../parse-automation-issue'

export const LIST_PATH = 'data/verified-automations-list.json'

export interface Repository {
  owner: string
  repo: string
  /** Long-lived branch the approvals are staged on. */
  branch: string
  /** Branch the approvals are ultimately merged into. */
  base: string
}

export interface StageResult {
  /** Entries written to the branch by this run. */
  added: AutomationEntry[]
  /** Usernames that were already listed, on main or on the open pull request. */
  alreadyListed: string[]
  /** The pull request holding the entries, or null when nothing was added. */
  pull: { number: number; created: boolean } | null
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

/** The open pull request for the branch, or null when there is none. */
async function openPull(
  octokit: Octokit,
  { owner, repo, branch, base }: Repository,
): Promise<number | null> {
  const { data } = await octokit.rest.pulls.list({
    owner,
    repo,
    head: `${owner}:${branch}`,
    base,
    state: 'open',
    per_page: 1,
  })

  return data[0]?.number ?? null
}

/** Points the branch at main's tip, creating it when it does not exist yet. */
async function resetToBase(
  octokit: Octokit,
  { owner, repo, branch, base }: Repository,
): Promise<void> {
  const { data: tip } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${base}`,
  })

  try {
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: tip.object.sha,
      force: true,
    })
  } catch (error) {
    if ((error as { status?: number })?.status !== 422) {
      throw error
    }

    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: tip.object.sha,
    })
  }
}

/**
 * Adds `incoming` to the approvals branch and makes sure a pull request is open
 * for it, deduped against main and against whatever that pull request already
 * stages.
 */
export async function stageApprovals(
  octokit: Octokit,
  repository: Repository,
  incoming: AutomationEntry[],
  { message, title, body }: { message: string; title: string; body: string },
): Promise<StageResult> {
  const { owner, repo, branch, base } = repository
  const pull = await openPull(octokit, repository)

  if (pull === null) {
    // No pull request to append to, so the branch starts again from main and
    // the list is read from there.
    await resetToBase(octokit, repository)
  }

  const { data: file } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: LIST_PATH,
    ref: pull === null ? base : branch,
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

  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: LIST_PATH,
    branch,
    message,
    // The blob being replaced. The branch is at main's tip or is the one this
    // sha was read from, so a stale sha means a concurrent run and the call is
    // rejected rather than overwriting it.
    sha: file.sha,
    content: Buffer.from(serializeList([...list, ...added])).toString('base64'),
  })

  if (pull !== null) {
    return { added, alreadyListed, pull: { number: pull, created: false } }
  }

  const { data: created } = await octokit.rest.pulls.create({
    owner,
    repo,
    head: branch,
    base,
    title,
    body,
  })

  return {
    added,
    alreadyListed,
    pull: { number: created.number, created: true },
  }
}
