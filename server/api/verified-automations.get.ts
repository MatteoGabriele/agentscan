import type { VerifiedAutomation } from '~~/shared/types/automation'

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage('assets:data').getItemRaw(
      'verified-automations-list.json',
    )

    if (!raw) {
      return []
    }

    const content = Buffer.isBuffer(raw) ? raw.toString() : String(raw)
    const results: VerifiedAutomation[] = JSON.parse(content)

    return results
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch verified automations list',
    })
  }
})
