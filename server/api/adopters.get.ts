import type { AdopterRepository } from '~~/shared/types/adopter-repository'

// Served from data/adopters.json, updated with `pnpm collect:adopters`.
export default defineEventHandler(async (): Promise<AdopterRepository[]> => {
  try {
    const adopters =
      await useStorage('assets:data').getItem<AdopterRepository[]>(
        'adopters.json',
      )

    return adopters ?? []
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch repositories using AgentScan',
      cause: error,
    })
  }
})
