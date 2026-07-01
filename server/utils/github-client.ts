import { Octokit } from 'octokit'
import type { RequestError } from '@octokit/request-error'
import type { ResponseHeaders } from '@octokit/types'
import { trackServerEvent } from './track-event'

type RequestOptions = { method: string; url: string }

function trackGithubRequest(options: RequestOptions, headers: ResponseHeaders, status: number) {
  return trackServerEvent('github_api_request', {
    endpoint: `${options.method} ${options.url}`,
    status,
    remaining: Number(headers['x-ratelimit-remaining'] ?? -1),
    limit: Number(headers['x-ratelimit-limit'] ?? -1),
  })
}

export const TrackedOctokit = Octokit.plugin((octokit) => {
  octokit.hook.after('request', (response, options) => {
    return trackGithubRequest(options, response.headers, response.status)
  })

  octokit.hook.error('request', async (error, options) => {
    const requestError = error as RequestError
    await trackGithubRequest(
      options,
      requestError.response?.headers ?? {},
      requestError.status ?? 0,
    )
    throw error
  })
})

export function createOctokit(auth?: string) {
  return new TrackedOctokit({ auth })
}
