export const MAX_PR_COUNT = 10

/**
 * Version of the `/api/scan` response shape. The client sends it with every
 * scan, so it's part of the URL and of every cache key built from it: the
 * browser's (`max-age`), Netlify's CDN and Nitro's server cache, which
 * survives code changes and dev restarts and serves an expired entry once
 * while it revalidates. Bump it whenever the response shape changes, or those
 * caches can hand an old-shape response to the new client.
 */
export const SCAN_RESPONSE_VERSION = 2
