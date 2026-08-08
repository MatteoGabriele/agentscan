import type { DailyScanEntry } from '~~/shared/utils/daily-rollup'
import { getDailyCountsByDate } from '~~/shared/utils/daily-rollup'
import { applyCumulativeTrends } from '~~/shared/utils/count-classification-by-date'
import { getHistoryRangeStart } from '~~/shared/utils/health-history-window'

function getRecentEntries(entries: DailyScanEntry[]): DailyScanEntry[] {
  const latestDate = entries.reduce(
    (latest, entry) => (entry.date > latest ? entry.date : latest),
    '',
  )

  if (!latestDate) {
    return entries
  }

  const rangeStart = getHistoryRangeStart(latestDate).slice(0, 10)

  return entries.filter((entry) => entry.date >= rangeStart)
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const isFullHistory = String(query.full ?? 'false') === 'true'

    const raw = await useStorage('assets:data').getItemRaw(
      'daily-scan-results.json',
    )

    if (!raw) {
      throw new Error('daily-scan-results.json not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const allEntries = JSON.parse(content) as DailyScanEntry[]
    const entries = isFullHistory ? allEntries : getRecentEntries(allEntries)

    const countsByDate = getDailyCountsByDate(entries)
    const categoryProgression = applyCumulativeTrends(countsByDate)
    const dates = Object.keys(countsByDate).sort()
    const scanTimes = dates.map(
      (date) => countsByDate[date]?.createdAt ?? `${date}T00:00:00.000Z`,
    )

    return {
      entries,
      categoryProgression,
      countsByDate,
      dates,
      scanTimes,
    }
  } catch (error) {
    console.error('Daily scan fetch error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch daily scan results',
    })
  }
})
