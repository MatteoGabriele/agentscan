import { describe, it, expect } from 'vitest'
import { split } from '../lib/automations-list'
import type { AutomationEntry } from '../parse-automation-issue'

const entry = (username: string): AutomationEntry => ({
  username,
  id: username.length,
  reason: 'Self-disclosed as an AI agent.',
  issueUrl: 'https://github.com/MatteoGabriele/agentscan/issues/1',
  createdAt: '2026-09-12',
  reportedBy: 'reporter',
})

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

  it('adds everything when the list is empty', () => {
    const { added, alreadyListed } = split([], [entry('a'), entry('b')])

    expect(added.map((e) => e.username)).toEqual(['a', 'b'])
    expect(alreadyListed).toEqual([])
  })
})
