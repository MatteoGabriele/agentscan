import type { DailyScanEntry } from '~~/shared/utils/daily-rollup'

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage('assets:data').getItemRaw(
      'daily-scan-results.json',
    )

    if (!raw) {
      throw new Error('daily-scan-results.json not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)

    return { entries: JSON.parse(content) as DailyScanEntry[] }
  } catch (error) {
    console.error('Daily scan fetch error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch daily scan results',
    })
  }
})
