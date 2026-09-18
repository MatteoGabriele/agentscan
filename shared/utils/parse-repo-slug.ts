type ParseRepoSlugReturn = {
  owner: string
  repo: string
  path: string
} | null

/**
 * GitHub logins: alphanumerics and single internal hyphens, 39 characters max.
 * A leading, trailing or doubled hyphen is not a login.
 */
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/

/** Repository names: alphanumerics plus `-`, `_` and `.`, 100 characters max. */
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

/**
 * Turns whatever a contributor pasted into an `owner/repo` pair, or null.
 */
export function parseRepoSlug(input: string): ParseRepoSlugReturn {
  const trimmed = input.trim()

  if (!trimmed) {
    return null
  }

  // Only github.com is stripped.
  const withoutOrigin = trimmed
    .replace(/^[A-Za-z][A-Za-z0-9+.-]*:\/\//, '')
    .replace(/^(?:www\.)?github\.com\//i, '')

  const [pathname = ''] = withoutOrigin.split(/[?#]/)

  // First two segments, not the last two: `owner/repo/pull/123` is a link to a
  // pull request in `owner/repo`, and reading it from the end scans `pull/123`.
  const [owner, rawRepo] = pathname.split('/').filter(Boolean)

  if (!owner || !rawRepo) {
    return null
  }

  // GitHub rejects repository names ending in `.git`, so the suffix is only ever
  // the tail of a clone URL.
  const repo = rawRepo.replace(/\.git$/i, '')

  if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) {
    return null
  }

  if (repo === '.' || repo === '..') {
    return null
  }

  return {
    owner,
    repo,
    path: `${owner}/${repo}`,
  }
}
