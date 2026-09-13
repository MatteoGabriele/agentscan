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
  // The trailing newline only keeps `git diff` quiet before the commit; the
  // pre-commit prettier run is what actually settles the formatting.
  fs.writeFileSync(listPath(), JSON.stringify(entries, null, 2) + '\n')
}

/**
 * GitHub logins are case-insensitive, so the list is deduped that way too — a
 * report for `SomeBot` must not add a second entry next to `somebot`.
 */
const key = (entry: AutomationEntry | string): string =>
  (typeof entry === 'string' ? entry : entry.username).toLowerCase()

/**
 * Splits `incoming` against the list as it stands. The set grows as it goes, so
 * two reports for the same account add one entry and the second is reported as
 * already listed.
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
