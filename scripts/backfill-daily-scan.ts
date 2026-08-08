/// <reference types="node" />

/**
 * Fills `daily-scan-results.json` with the days that predate the hourly window.
 *
 * The daily rollup only ever sees the last ~30 hours of window scans, so every
 * day before it started has no entry and never will. The fixed daily sample in
 * `scan-results.txt` does reach back that far — one run per day since the scans
 * began — so each of those runs is folded into the same shape to give the
 * series a history. Those counts come from a capped top-N-per-repo sample
 * rather than the day's full PR traffic, so they are comparable to a window day
 * by percentage, not by raw count.
 *
 * Re-running is safe: days already in the file are left exactly as they are.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { unpack } from '../shared/utils/compactor'
import type { DailyScanEntry } from '../shared/utils/daily-rollup'
import {
  getSampleDailyEntries,
  mergeDailyEntries,
} from '../shared/utils/daily-rollup'

const DEFAULT_INPUT_FILE = 'scan-results.txt'
const DEFAULT_OUTPUT_FILE = 'daily-scan-results.json'

interface BackfillOptions {
  inputFile?: string
  outputFile?: string
  dryRun?: boolean
}

function dataPath(file: string): string {
  return join(process.cwd(), 'data', file)
}

function loadDailyEntries(outputFile: string): DailyScanEntry[] {
  try {
    return JSON.parse(readFileSync(dataPath(outputFile), 'utf-8'))
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw err
  }
}

export function backfill(options: BackfillOptions = {}) {
  const {
    inputFile = DEFAULT_INPUT_FILE,
    outputFile = DEFAULT_OUTPUT_FILE,
    dryRun = false,
  } = options

  const results = unpack(readFileSync(dataPath(inputFile), 'utf-8'))
  const stored = loadDailyEntries(outputFile)
  const entries = mergeDailyEntries(stored, getSampleDailyEntries(results))
  const added = entries.length - stored.length

  console.log(`${inputFile}: ${results.length} rows`)
  console.log(`${outputFile}: ${stored.length} day(s) stored`)
  console.log(`Backfill: ${added} day(s) added, ${entries.length} total`)

  if (entries.length) {
    console.log(`Range: ${entries.at(0)!.date} → ${entries.at(-1)!.date}`)
  }

  if (dryRun) {
    console.log('Dry run — nothing written')
    return entries
  }

  writeFileSync(dataPath(outputFile), `${JSON.stringify(entries, null, 2)}\n`)

  return entries
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2)
  const inputArg = args.find((a) => a.startsWith('--input='))
  const outputArg = args.find((a) => a.startsWith('--output='))

  backfill({
    dryRun: args.includes('--dry-run'),
    ...(inputArg && { inputFile: inputArg.split('=')[1] }),
    ...(outputArg && { outputFile: outputArg.split('=')[1] }),
  })
}
