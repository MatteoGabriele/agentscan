import type { VerifiedAutomation } from '~~/shared/types/automation'

export default defineEventHandler(async () => {
  try {
    const results = await useStorage('assets:data').getItem<
      VerifiedAutomation[]
    >('verified-automations-list.json')

    return results ?? []
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch verified automations list',
    })
  }
})
