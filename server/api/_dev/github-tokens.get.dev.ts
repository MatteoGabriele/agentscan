import type {
  DevTokenPanelConfig,
  DevTokenUsage,
  DevTokenUsageResponse,
} from '~~/shared/types/dev-token-panel'
import { devTokenResources } from '~~/shared/types/dev-token-panel'

// GitHub rate limit usage for the tokens listed in
// runtimeConfig.devTokenPanelTokens. Backs <DevTokenPanel>.
// The `.dev` suffix keeps this route out of production builds entirely.

async function getTokenUsage(
  name: string,
  token: string,
): Promise<DevTokenUsage> {
  // GET /rate_limit doesn't count against the quota, so polling it is free.
  const octokit = createOctokit(token)

  try {
    const { data } = await octokit.rest.rateLimit.get()

    const resources: DevTokenUsage['resources'] = {}
    for (const key of devTokenResources) {
      const usage = data.resources[key]
      if (usage) {
        resources[key] = usage
      }
    }

    return {
      name,
      error: null,
      resources,
    }
  } catch (error) {
    const status = (error as { status?: number }).status
    return {
      name,
      error: status ? `HTTP ${status}` : String(error),
      resources: {},
    }
  }
}

export default defineEventHandler(async (): Promise<DevTokenUsageResponse> => {
  const runtimeConfig = useRuntimeConfig()
  const config = runtimeConfig.public.devTokenPanel as DevTokenPanelConfig

  if (!config.enabled) {
    throw createError({ statusCode: 404 })
  }

  // Several env vars may hold the same token; query each distinct one once.
  const labelsByToken = new Map<string, string[]>()
  for (const { env, label } of runtimeConfig.devTokenPanelTokens) {
    const token = process.env[env]
    if (token) {
      labelsByToken.set(token, [...(labelsByToken.get(token) ?? []), label])
    }
  }

  const tokens = await Promise.all(
    [...labelsByToken].map(([token, labels]) =>
      getTokenUsage(labels.join(' = '), token),
    ),
  )

  return { fetchedAt: Date.now(), tokens }
})
