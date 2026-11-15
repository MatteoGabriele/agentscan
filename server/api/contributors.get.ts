import type { ContributorsResponse } from '~~/shared/types/contributor'

// Served from data/contributors.json, updated with `pnpm collect:adopters`.
export default defineEventHandler(async (): Promise<ContributorsResponse> => {
  try {
    const contributors =
      await useStorage('assets:data').getItem<ContributorsResponse>(
        'contributors.json',
      )

    return contributors ?? { repositories: [], contributors: [] }
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch contributors.',
      cause: error,
    })
  }
})
