export function parseRepoSlug(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim().replace(/\/$/, '')

  const slugMatch = cleaned.match(/^([^/\s]+)\/([^/\s]+)$/)
  if (slugMatch?.[1] && slugMatch[2]) {
    return { owner: slugMatch[1], repo: slugMatch[2] }
  }

  return null
}
