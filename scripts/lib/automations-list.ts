/// <reference types="node" />

import fs from 'fs'
import path from 'path'
import type { AutomationEntry } from '../parse-automation-issue'

export const LIST_PATH = 'data/verified-automations-list.json'

const listPath = (): string => path.join(process.cwd(), LIST_PATH)

export function readList(): AutomationEntry[] {
  return JSON.parse(fs.readFileSync(listPath(), 'utf-8')) as AutomationEntry[]
}

export function writeList(entries: AutomationEntry[]): void {
  // Trailing newline matches prettier's output.
  fs.writeFileSync(listPath(), JSON.stringify(entries, null, 2) + '\n')
}

/** Case-insensitive key, matching how GitHub treats logins. */
const key = (entry: AutomationEntry | string): string =>
  (typeof entry === 'string' ? entry : entry.username).toLowerCase()

/**
 * Splits `incoming` into new and already listed entries. Repeats within
 * `incoming` count as already listed.
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
