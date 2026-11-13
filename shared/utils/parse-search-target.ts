export type SearchTarget =
  | { kind: 'account'; name: string }
  | { kind: 'repository'; owner: string; repo: string; path: string }

const GITHUB_URL = /^(?:https?:\/\/)?(?:www\.)?github\.com\//i

/**
 * Reads what the user typed into the search field: a username (`torvalds`,
 * `@torvalds`), a repository (`nuxt/nuxt`) or any GitHub link to either.
 * Usernames can't contain `/`, so one segment is an account and two or more
 * are a repository (extra segments, like `/pull/1`, are ignored).
 */
export function parseSearchTarget(input: string): SearchTarget | null {
  const value = input
    .trim()
    .replace(GITHUB_URL, '')
    .replace(/[?#].*$/, '')

  if (!value || /\s/.test(value)) {
    return null
  }

  const [first, second] = value.split('/').filter(Boolean)

  if (!first) {
    return null
  }

  if (second) {
    const repo = second.replace(/\.git$/i, '')

    return { kind: 'repository', owner: first, repo, path: `${first}/${repo}` }
  }

  const name = first.replace(/^@/, '').toLowerCase()

  return name ? { kind: 'account', name } : null
}
