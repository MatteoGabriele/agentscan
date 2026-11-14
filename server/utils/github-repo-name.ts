/**
 * The repository's current owner/name on GitHub, which follows renames and
 * transfers (facebook/react → react/react). Null when GitHub doesn't know it.
 */
export async function getGitHubRepoName(
  repo: string,
  token?: string,
): Promise<string | null> {
  const [owner, name] = repo.split('/')

  if (!owner || !name) {
    return null
  }

  try {
    const { data } = await createOctokit(token).rest.repos.get({
      owner,
      repo: name,
    })

    return data.full_name
  } catch {
    return null
  }
}
