import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Other code reads this path; update every usage before renaming the file.
describe('data/verified-automations-list.json', () => {
  it('exists at the path the GitHub Actions flow writes to', () => {
    expect(
      existsSync(resolve(repoRoot, 'data/verified-automations-list.json')),
    ).toBe(true)
  })
})
