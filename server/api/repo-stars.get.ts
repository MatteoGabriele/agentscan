export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const octokit = createOctokit(config.githubToken)

  try {
    const { data } = await octokit.rest.repos.get({
      owner: 'MatteoGabriele',
      repo: 'agentscan',
    })

    return { stars: data.stargazers_count }
  } catch {
    // The header still renders the repository link, just without a count, so
    // a failed call here should not blow up every page.
    return { stars: null }
  }
})
