import { Octokit } from 'octokit'

// Netlify kills a function after ~30s of silence. Octokit's default throttle
// sleeps until the quota resets (up to an hour), which turns an exhausted
// token into a hanging request and a blank page. Only retry short waits.
const MAX_RETRY_AFTER_SECONDS = 5

function shouldRetry(
  retryAfter: number,
  options: { request: { retryCount: number } },
): boolean {
  return (
    options.request.retryCount === 0 && retryAfter <= MAX_RETRY_AFTER_SECONDS
  )
}

export function createOctokit(auth?: string) {
  return new Octokit({
    auth,
    throttle: {
      onRateLimit: shouldRetry,
      onSecondaryRateLimit: shouldRetry,
    },
  })
}
