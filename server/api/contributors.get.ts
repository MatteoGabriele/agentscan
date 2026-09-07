import type { Endpoints } from '@octokit/types'
import { isGitHubAppAccount } from '@unveil/identity'
import { projectRepositories } from '~~/shared/project-repositories'
import type {
  Contributor,
  ContributorsResponse,
  Repository,
} from '~~/shared/types/contributor'

type GitHubContributor =
  Endpoints['GET /repos/{owner}/{repo}/contributors']['response']['data'][number]

type CompleteGitHubContributor = GitHubContributor &
  Required<Pick<GitHubContributor, 'id' | 'avatar_url' | 'login'>>

function isCompleteAccount(
  account: GitHubContributor,
): account is CompleteGitHubContributor {
  return (
    account.id !== undefined &&
    account.login !== undefined &&
    account.avatar_url !== undefined
  )
}

function getUniqueContributorsFromRepositories(
  repositories: Repository[],
): Contributor[] {
  const contributors =
    repositories?.flatMap((repository) => repository.contributors) ?? []

  const contributorsMap = contributors.reduce<Record<number, Contributor>>(
    (acc, contributor) => {
      const match = acc[contributor.id]

      if (match) {
        match.contributions += contributor.contributions
      } else {
        acc[contributor.id] = contributor
      }

      return acc
    },
    {},
  )

  return Object.values(contributorsMap).sort(
    (a, b) => b.contributions - a.contributions,
  )
}

export default defineEventHandler(async (): Promise<ContributorsResponse> => {
  const config = useRuntimeConfig()
  const octokit = createOctokit(config.githubToken)

  try {
    const repositories = await Promise.all(
      projectRepositories.map(async ({ repo, label, owner }) => {
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
            .filter((account): account is CompleteGitHubContributor => {
              return (
                isCompleteAccount(account) &&
                !isGitHubAppAccount(account) &&
                account.login !== 'actions-user'
              )
            })
            .map((account) => ({
              id: account.id,
              name: account.login,
              avatar: `${account.avatar_url}&s=50`,
              url: `https://github.com/${account.login}`,
              contributions: account.contributions,
            })),
        }
      }),
    )

    const contributors = getUniqueContributorsFromRepositories(repositories)

    return {
      repositories,
      contributors,
    }
  } catch {
    throw createError({
      status: 500,
      message: 'Failed to fetch contributors.',
    })
  }
})
