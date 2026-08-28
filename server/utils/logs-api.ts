import type { NitroFetchOptions } from 'nitropack'

const DEFAULT_TIMEOUT_MS = 10_000

export async function fetchFromLogs<T>(
  path: string,
  options: NitroFetchOptions<string> = {},
): Promise<T> {
  const { logsApiBase } = useRuntimeConfig()

  try {
    return await $fetch<T>(path, {
      baseURL: logsApiBase,
      timeout: DEFAULT_TIMEOUT_MS,
      ...options,
    })
  } catch (error) {
    const status = (error as { status?: number; statusCode?: number }).status

    console.error(`agentscan-logs request failed for ${path}:`, error)

    throw createError({
      statusCode: status && status < 500 ? 502 : 503,
      message: 'Scan data is currently unavailable',
    })
  }
}
