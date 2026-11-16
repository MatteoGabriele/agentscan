export interface GitHubRateLimitStatus {
  limited: boolean
  // Unix time in milliseconds; null when not limited.
  resetAt: number | null
}
