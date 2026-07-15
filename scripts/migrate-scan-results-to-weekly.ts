/// <reference types="node" />
import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { unpack, pack } from '../shared/utils/compactor'
import { getDayKey } from '../shared/utils/charts'
import { getMondayDateKey } from '../shared/utils/count-classification-by-date'
import { buildWeeklyEntry } from '../shared/utils/weekly-aggregator'
import type { EcosystemHealthItem } from '../shared/types/ecosystem-health'

const millisecondsPerDay = 24 * 60 * 60 * 1000

function getCompleteWeekStarts(items: EcosystemHealthItem[]): string[] {
  const availableDays = new Set(items.map((item) => getDayKey(item.created_at)))
  const weekStarts = [
    ...new Set([...availableDays].map((day) => getMondayDateKey(day))),
  ].sort()

  return weekStarts.filter((weekStart) => {
    const weekStartTime = new Date(`${weekStart}T00:00:00.000Z`).getTime()
    return Array.from({ length: 7 }, (_, dayOffset) => {
      const day = new Date(weekStartTime + dayOffset * millisecondsPerDay)
      return getDayKey(day.toISOString())
    }).every((day) => availableDays.has(day))
  })
}

function main() {
  const rawFilePath = join(process.cwd(), 'data', 'scan-results.txt')
  const weeklyFilePath = join(process.cwd(), 'data', 'scan-results.json')
  const tmpFilePath = join(process.cwd(), 'data', 'scan-results-tmp.txt')

  const items = unpack(readFileSync(rawFilePath, 'utf-8'))
  console.log(`Loaded ${items.length} raw entries from data/scan-results.txt`)

  const completeWeekStarts = getCompleteWeekStarts(items)
  const weeklyEntries = completeWeekStarts.map((weekStart) =>
    buildWeeklyEntry(items, weekStart),
  )

  writeFileSync(weeklyFilePath, JSON.stringify(weeklyEntries, null, 2))
  console.log(
    `Wrote ${weeklyEntries.length} weekly entries to data/scan-results.json (${weeklyEntries[0]?.weekStart} -> ${weeklyEntries.at(-1)?.weekEnd})`,
  )

  const compactedDays = new Set(
    completeWeekStarts.flatMap((weekStart) => {
      const weekStartTime = new Date(`${weekStart}T00:00:00.000Z`).getTime()
      return Array.from({ length: 7 }, (_, dayOffset) =>
        getDayKey(
          new Date(
            weekStartTime + dayOffset * millisecondsPerDay,
          ).toISOString(),
        ),
      )
    }),
  )

  const leftoverItems = items.filter(
    (item) => !compactedDays.has(getDayKey(item.created_at)),
  )
  const leftoverDays = [
    ...new Set(leftoverItems.map((item) => getDayKey(item.created_at))),
  ].sort()

  const droppedLeadingDays = leftoverDays.filter(
    (day) => day < (completeWeekStarts[0] ?? '9999-99-99'),
  )
  const seededTrailingDays = leftoverDays.filter(
    (day) => !droppedLeadingDays.includes(day),
  )

  const seededItems = leftoverItems.filter((item) =>
    seededTrailingDays.includes(getDayKey(item.created_at)),
  )

  writeFileSync(tmpFilePath, pack(seededItems))
  console.log(
    `Seeded data/scan-results-tmp.txt with ${seededItems.length} entries across days: ${seededTrailingDays.join(', ') || '(none)'}`,
  )

  if (droppedLeadingDays.length) {
    console.log(
      `Dropped incomplete leading days (never reach a full Mon-Sun week): ${droppedLeadingDays.join(', ')}`,
    )
  }

  unlinkSync(rawFilePath)
  console.log(
    'Removed data/scan-results.txt (superseded, still in git history)',
  )
}

main()
