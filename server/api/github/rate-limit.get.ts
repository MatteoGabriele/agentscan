import type { GitHubRateLimitStatus } from '~~/shared/types/github-rate-limit'

// GET /rate_limit doesn't count against the quota, so this is safe to call
// even when the token is exhausted.
export default defineCachedEventHandler(
  async (): Promise<GitHubRateLimitStatus> => {
    const config = useRuntimeConfig()
    const octokit = createOctokit(config.githubToken)

    try {
      const { data } = await octokit.rest.rateLimit.get()
      const { remaining, reset } = data.resources.core
      const limited = remaining === 0

      return { limited, resetAt: limited ? reset * 1000 : null }
    } catch {
      // Unknown is not limited: don't warn about something we can't confirm.
      return { limited: false, resetAt: null }
    }
  },
  {
    maxAge: 60,
  },
)
