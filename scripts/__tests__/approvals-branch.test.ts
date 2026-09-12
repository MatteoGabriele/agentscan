import { describe, it, expect, vi } from 'vitest'
import type { Octokit } from 'octokit'
import {
  serializeList,
  split,
  stageApprovals,
  type Repository,
} from '../lib/approvals-branch'
import type { AutomationEntry } from '../parse-automation-issue'

const repository: Repository = {
  owner: 'MatteoGabriele',
  repo: 'agentscan',
  branch: 'automation/approved-reports',
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
 * The API surface stageApprovals touches: the open pull request, the list on
 * whichever ref it reads, and the calls that reset the branch and write to it.
 */
function fakeOctokit({
  open = null as number | null,
  list = [] as AutomationEntry[],
  branchMissing = false,
}) {
  const calls = {
    getContent: vi.fn(async () => ({
      data: {
        sha: 'blob-sha',
        content: Buffer.from(serializeList(list)).toString('base64'),
      },
    })),
    updateRef: vi.fn(async () => {
      if (branchMissing) {
        throw Object.assign(new Error('Reference does not exist'), {
          status: 422,
        })
      }

      return { data: {} }
    }),
    createRef: vi.fn(async () => ({ data: {} })),
    createOrUpdateFileContents: vi.fn(async () => ({ data: {} })),
    create: vi.fn(async () => ({ data: { number: 99 } })),
  }

  const octokit = {
    rest: {
      pulls: {
        list: vi.fn(async () => ({
          data: open === null ? [] : [{ number: open }],
        })),
        create: calls.create,
      },
      repos: {
        getContent: calls.getContent,
        createOrUpdateFileContents: calls.createOrUpdateFileContents,
      },
      git: {
        getRef: vi.fn(async () => ({ data: { object: { sha: 'main-sha' } } })),
        updateRef: calls.updateRef,
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
  it('resets the branch to main and opens a pull request', async () => {
    const { octokit, calls, written } = fakeOctokit({ list: [entry('old')] })

    const result = await stageApprovals(
      octokit,
      repository,
      [entry('new')],
      pullRequest,
    )

    // The branch is rebuilt on main's tip, so the list is read from main.
    expect(calls.updateRef).toHaveBeenCalledWith(
      expect.objectContaining({ sha: 'main-sha', force: true }),
    )
    expect(calls.getContent).toHaveBeenCalledWith(
      expect.objectContaining({ ref: 'main' }),
    )
    expect(written().map((e) => e.username)).toEqual(['old', 'new'])
    expect(result.pull).toEqual({ number: 99, created: true })
  })

  it('creates the branch when it does not exist yet', async () => {
    const { octokit, calls } = fakeOctokit({ branchMissing: true })

    await stageApprovals(octokit, repository, [entry('new')], pullRequest)

    expect(calls.createRef).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: `refs/heads/${repository.branch}`,
        sha: 'main-sha',
      }),
    )
  })

  it('appends to the open pull request instead of resetting the branch', async () => {
    const { octokit, calls, written } = fakeOctokit({
      open: 7,
      list: [entry('staged')],
    })

    const result = await stageApprovals(
      octokit,
      repository,
      [entry('new'), entry('staged')],
      pullRequest,
    )

    expect(calls.updateRef).not.toHaveBeenCalled()
    // The list is read from the branch, so entries waiting in the pull request
    // are deduped against too.
    expect(calls.getContent).toHaveBeenCalledWith(
      expect.objectContaining({ ref: repository.branch }),
    )
    expect(written().map((e) => e.username)).toEqual(['staged', 'new'])
    expect(result.alreadyListed).toEqual(['staged'])
    expect(result.pull).toEqual({ number: 7, created: false })
    expect(calls.create).not.toHaveBeenCalled()
  })

  it('writes nothing when every entry is already listed', async () => {
    const { octokit, calls } = fakeOctokit({ list: [entry('listed')] })

    const result = await stageApprovals(
      octokit,
      repository,
      [entry('listed')],
      pullRequest,
    )

    expect(calls.createOrUpdateFileContents).not.toHaveBeenCalled()
    expect(calls.create).not.toHaveBeenCalled()
    expect(result).toMatchObject({ added: [], alreadyListed: ['listed'] })
    expect(result.pull).toBeNull()
  })

  it('sends the blob sha it read, so a concurrent write is rejected', async () => {
    const { octokit, calls } = fakeOctokit({})

    await stageApprovals(octokit, repository, [entry('new')], pullRequest)

    expect(calls.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ sha: 'blob-sha', branch: repository.branch }),
    )
  })
})
