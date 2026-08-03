import { unpack } from '~~/shared/utils/compactor'

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage('assets:data').getItemRaw(
      'hourly-scan-results.txt',
    )

    if (!raw) {
      throw new Error('hourly-scan-results.txt not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const results = unpack(content)

    return results
  } catch (error) {
    console.error('Ecosystem health fetch error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch verified automations list',
    })
  }
})
