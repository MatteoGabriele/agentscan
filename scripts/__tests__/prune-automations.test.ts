import { describe, it, expect } from 'vitest'
import { classify, isGone, type Check } from '../prune-automations'
import type { AutomationEntry } from '../parse-automation-issue'

const entry: AutomationEntry = {
  username: 'somebot',
  id: 42,
  reason: 'Self-disclosed as an AI agent.',
  issueUrl: 'https://github.com/MatteoGabriele/agentscan/issues/1',
  createdAt: '2026-03-03',
  reportedBy: 'MatteoGabriele',
}

const check = (status: ReturnType<typeof classify>): Check => ({
  entry,
  status,
})

describe('classify', () => {
  it('keeps an entry whose login still answers with the reported id', () => {
    expect(classify(entry, { id: 42 })).toEqual({ state: 'listed' })
  })

  it('keeps an entry whose login only differs in case', () => {
    expect(classify(entry, null, { login: 'SomeBot' })).toEqual({
      state: 'listed',
    })
  })

  it('reports a rename when the id answers under another login', () => {
    expect(classify(entry, null, { login: 'renamedbot' })).toEqual({
      state: 'renamed',
      login: 'renamedbot',
    })
  })

  it('reports a reclaimed login when the id is gone but the name answers', () => {
    expect(classify(entry, { id: 99 }, null)).toEqual({
      state: 'reclaimed',
      id: 99,
    })
  })

  it('reports a gone account when neither lookup answers', () => {
    expect(classify(entry, null, null)).toEqual({ state: 'gone' })
  })
})

describe('isGone', () => {
  it('prunes accounts that are gone or whose login was reclaimed', () => {
    expect(isGone(check({ state: 'gone' }))).toBe(true)
    expect(isGone(check({ state: 'reclaimed', id: 99 }))).toBe(true)
  })

  it('keeps listed and renamed accounts', () => {
    expect(isGone(check({ state: 'listed' }))).toBe(false)
    expect(isGone(check({ state: 'renamed', login: 'renamedbot' }))).toBe(false)
  })
})
