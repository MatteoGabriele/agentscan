import type { LibrariesResponse } from '~~/shared/types/logs-api'

export default defineCachedEventHandler(
  async (): Promise<LibrariesResponse> => {
    const data =
      await fetchFromLogs<Partial<LibrariesResponse>>('/api/libraries')
    const repos = data.repos ?? []

    return {
      total: data.total ?? repos.length,
      repos,
      // Older agentscan-logs deploys only send the flat list.
      categories: data.categories ?? [
        { name: 'All repositories', group: 'All', repos },
      ],
    }
  },
  {
    // A new cache name so entries stored before `categories` existed are not served.
    name: 'libraries-by-category',
    maxAge: 60 * 60 * 24,
  },
)
