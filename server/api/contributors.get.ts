import { isKnownBot } from '~~/shared/cicd-known-bots'
import { projectRepositories } from '~~/shared/project-repositories'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const octokit = createOctokit(config.githubToken)

  try {
    const requests = await Promise.all(
      projectRepositories.map(({ owner, repo }) => {
        return octokit.rest.repos.listContributors({
          owner,
          repo,
          per_page: 30,
        })
      }),
    )

    const allContributors = requests.flatMap((request) => request.data)

    const contributors = [
      ...new Map(
        allContributors
          .filter((account) => !isKnownBot(account.login ?? ''))
          .map((account) => [account.login, account]),
      ).values(),
    ]

    return contributors.map((item) => ({
      name: item.login,
      avatar: `${item.avatar_url}&s=50`,
      url: `https://github.com/${item.login}`,
      id: item.id,
    }))
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch contributors',
    })
  }
})
