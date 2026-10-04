/// <reference types="node" />

export function readGithubToken(): string {
  const token = process.env.NUXT_GITHUB_TOKEN || process.env.GITHUB_TOKEN

  if (!token) {
    console.error(
      '✗ No GitHub token — set NUXT_GITHUB_TOKEN in .env, or `export GITHUB_TOKEN=$(gh auth token)`',
    )
    process.exit(1)
  }

  return token
}
