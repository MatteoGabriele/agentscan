type ParseRepoSlugReturn = {
  owner: string
  repo: string
  path: string
} | null

export function parseRepoSlug(input: string): ParseRepoSlugReturn {
  const slugMatch = input.trim().split('/')
  const owner = slugMatch?.[slugMatch.length - 2]
  const repo = slugMatch?.[slugMatch.length - 1]

  if (owner && repo) {
    return {
      owner,
      repo,
      path: `${owner}/${repo}`,
    }
  }

  return null
}
