import { describe, it, expect, vi } from 'vitest'
import type { Octokit } from 'octokit'
import {
  LIST_PATH,
  serializeList,
  split,
  stageApprovals,
  type Repository,
} from '../lib/approvals-branch'
import type { AutomationEntry } from '../parse-automation-issue'

const repository: Repository = {
  owner: 'MatteoGabriele',
  repo: 'agentscan',
  branch: 'automation/approvals-123',
  base: 'main',
}

const pullRequest = {
  message: 'chore: approvals',
  title: 'Approvals',
  body: '',
}

const entry = (username: string): AutomationEntry => ({
  username,
  id: username.length,
  reason: 'Self-disclosed as an AI agent.',
  issueUrl: 'https://github.com/MatteoGabriele/agentscan/issues/1',
  createdAt: '2026-09-12',
  reportedBy: 'reporter',
})

/**
 * The API surface stageApprovals touches: the list on main, the branch it cuts
 * for this run, and the commit and pull request it puts on it.
 */
function fakeOctokit({ list = [] as AutomationEntry[] } = {}) {
  const calls = {
    getContent: vi.fn(async () => ({
      data: {
        sha: 'blob-sha',
        content: Buffer.from(serializeList(list)).toString('base64'),
      },
    })),
    createRef: vi.fn(async () => ({ data: {} })),
    createOrUpdateFileContents: vi.fn(async () => ({ data: {} })),
    create: vi.fn(async () => ({ data: { number: 99 } })),
  }

  const octokit = {
    rest: {
      pulls: { create: calls.create },
      repos: {
        getContent: calls.getContent,
        createOrUpdateFileContents: calls.createOrUpdateFileContents,
      },
      git: {
        getRef: vi.fn(async () => ({ data: { object: { sha: 'main-sha' } } })),
        createRef: calls.createRef,
      },
    },
  } as unknown as Octokit

  /** The list as it was written by createOrUpdateFileContents. */
  const written = (): AutomationEntry[] => {
    const [args] = calls.createOrUpdateFileContents.mock.calls.at(-1) as [
      { content: string },
    ]

    return JSON.parse(Buffer.from(args.content, 'base64').toString('utf-8'))
  }

  return { octokit, calls, written }
}

describe('split', () => {
  it('keeps entries that are not listed yet', () => {
    const { added, alreadyListed } = split(
      [entry('listed')],
      [entry('fresh'), entry('listed')],
    )

    expect(added.map((e) => e.username)).toEqual(['fresh'])
    expect(alreadyListed).toEqual(['listed'])
  })

  it('dedupes case-insensitively, and within one run', () => {
    const { added, alreadyListed } = split(
      [entry('SomeBot')],
      [entry('somebot'), entry('twice'), entry('Twice')],
    )

    expect(added.map((e) => e.username)).toEqual(['twice'])
    expect(alreadyListed).toEqual(['somebot', 'Twice'])
  })
})

describe('stageApprovals', () => {
  it('appends to the list on main and opens a pull request for it', async () => {
    const { octokit, calls, written } = fakeOctokit({ list: [entry('old')] })

    const result = await stageApprovals(
      octokit,
      repository,
      [entry('new')],
      pullRequest,
    )

    // Read from main, never from a branch: nothing is staged anywhere else.
    expect(calls.getContent).toHaveBeenCalledWith(
      expect.objectContaining({ path: LIST_PATH, ref: 'main' }),
    )
    expect(written().map((e) => e.username)).toEqual(['old', 'new'])
    expect(result.pull).toEqual({ number: 99 })
    expect(calls.create).toHaveBeenCalledWith(
      expect.objectContaining({ head: repository.branch, base: 'main' }),
    )
  })

  it('cuts this run’s branch from main’s tip', async () => {
    const { octokit, calls } = fakeOctokit()

    await stageApprovals(octokit, repository, [entry('new')], pullRequest)

    expect(calls.createRef).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: `refs/heads/${repository.branch}`,
        sha: 'main-sha',
      }),
    )
  })

  it('writes nothing when every entry is already listed', async () => {
    const { octokit, calls } = fakeOctokit({ list: [entry('listed')] })

    const result = await stageApprovals(
      octokit,
      repository,
      [entry('listed')],
      pullRequest,
    )

    expect(calls.createRef).not.toHaveBeenCalled()
    expect(calls.createOrUpdateFileContents).not.toHaveBeenCalled()
    expect(calls.create).not.toHaveBeenCalled()
    expect(result).toMatchObject({ added: [], alreadyListed: ['listed'] })
    expect(result.pull).toBeNull()
  })

  it('sends the blob sha it read, so a concurrent write is rejected', async () => {
    const { octokit, calls } = fakeOctokit()

    await stageApprovals(octokit, repository, [entry('new')], pullRequest)

    expect(calls.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ sha: 'blob-sha', branch: repository.branch }),
    )
  })

  it('surfaces a failed branch creation instead of staging anyway', async () => {
    const { octokit, calls } = fakeOctokit()
    calls.createRef.mockRejectedValueOnce(
      Object.assign(new Error('Reference already exists'), { status: 422 }),
    )

    await expect(
      stageApprovals(octokit, repository, [entry('new')], pullRequest),
    ).rejects.toThrow('Reference already exists')

    // The caller leaves the issues open, so the next run stages them again.
    expect(calls.createOrUpdateFileContents).not.toHaveBeenCalled()
    expect(calls.create).not.toHaveBeenCalled()
  })
})
