import { projectRepositories } from '~~/shared/project-repositories'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const octokit = createOctokit(config.githubToken)

  const requests = await Promise.allSettled(
    projectRepositories.map(({ owner, repo }) => {
      return octokit.rest.repos.get({ owner, repo })
    }),
  )

  const repos = projectRepositories
    .map((repository, index) => {
      const request = requests[index]

      if (request?.status !== 'fulfilled') {
        return null
      }

      return {
        label: repository.label,
        stars: request.value.data.stargazers_count,
        url: `https://github.com/${repository.owner}/${repository.repo}`,
      }
    })
    .filter((repo) => repo !== null)

  if (!repos.length) {
    return {
      stars: null,
      repos: [],
    }
  }

  const stars = repos.reduce((total, repo) => total + repo.stars, 0)

  return {
    stars,
    repos,
  }
})
