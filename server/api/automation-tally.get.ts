import type { AutomationTally } from '~~/shared/types/automation'
import { decryptValue } from '~~/shared/utils/encrypt-values'

type AutomationTallyResultItem = {
  id: number
  counter: number
}

export default defineEventHandler(async () => {
  try {
    const results = await useStorage('assets:data').getItem<AutomationTally[]>(
      'automation-ids.json',
    )

    const items = results ?? []
    const itemsFormatted: AutomationTallyResultItem[] = []

    for (const [id, counter] of items) {
      // Rows written under an older secret can no longer be read back. They
      // stay in the file, so skip them rather than failing the whole list.
      try {
        itemsFormatted.push({ id: Number(decryptValue(id)), counter })
      } catch {
        continue
      }
    }

    return itemsFormatted
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch automation tally',
    })
  }
})
