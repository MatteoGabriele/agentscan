import { isGitHubAppAccount } from '@unveil/identity'
import { projectRepositories } from '~~/shared/project-repositories'
import type { RepositoryContributors } from '~~/shared/types/contributor'

export default defineEventHandler(
  async (): Promise<RepositoryContributors[]> => {
    const config = useRuntimeConfig()
    const octokit = createOctokit(config.githubToken)

    try {
      return await Promise.all(
        projectRepositories.map(async ({ owner, repo, label }) => {
          const { data } = await octokit.rest.repos.listContributors({
            owner,
            repo,
            per_page: 30,
          })

          return {
            repo,
            label,
            url: `https://github.com/${owner}/${repo}`,
            contributors: data
              .filter(
                (account): account is (typeof data)[number] & { id: number } =>
                  account.id !== undefined && !isGitHubAppAccount(account),
              )
              .map((account) => ({
                id: account.id,
                name: account.login ?? '',
                avatar: `${account.avatar_url}&s=50`,
                url: `https://github.com/${account.login}`,
                contributions: account.contributions,
              })),
          }
        }),
      )
    } catch {
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch contributors',
      })
    }
  },
)
