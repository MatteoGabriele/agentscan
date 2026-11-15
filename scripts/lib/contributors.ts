/// <reference types="node" />
import type { Endpoints } from '@octokit/types'
import { isGitHubAppAccount } from '@unveil/identity/providers/github'
import { Octokit } from 'octokit'
import { projectRepositories } from '../../shared/project-repositories'
import type {
  Contributor,
  ContributorsResponse,
  Repository,
} from '../../shared/types/contributor'

const CONTRIBUTORS_PAGE_SIZE = 30
const AVATAR_SIZE = 50

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

// Humans only: bots, apps and the Actions committer are left out.
export function isHumanContributor(
  account: GitHubContributor,
): account is CompleteGitHubContributor {
  return (
    isCompleteAccount(account) &&
    !isGitHubAppAccount(account) &&
    account.login !== 'actions-user'
  )
}

/**
 * One entry per person across repositories, contributions summed.
 * Sorted by contributions, then name, for stable diffs.
 */
export function mergeContributors(repositories: Repository[]): Contributor[] {
  const contributors = new Map<number, Contributor>()

  for (const contributor of repositories.flatMap((item) => item.contributors)) {
    const match = contributors.get(contributor.id)

    if (match) {
      match.contributions += contributor.contributions
    } else {
      contributors.set(contributor.id, { ...contributor })
    }
  }

  return [...contributors.values()].sort((a, b) => {
    return b.contributions - a.contributions || a.name.localeCompare(b.name)
  })
}

export async function collectContributors(
  token: string,
): Promise<ContributorsResponse> {
  const octokit = new Octokit({ auth: token })

  const repositories = await Promise.all(
    projectRepositories.map(async ({ owner, repo, label }) => {
      const { data } = await octokit.rest.repos.listContributors({
        owner,
        repo,
        per_page: CONTRIBUTORS_PAGE_SIZE,
      })

      return {
        repo,
        label,
        url: `https://github.com/${owner}/${repo}`,
        contributors: data.filter(isHumanContributor).map((account) => ({
          id: account.id,
          name: account.login,
          avatar: `${account.avatar_url}&s=${AVATAR_SIZE}`,
          url: `https://github.com/${account.login}`,
          contributions: account.contributions,
        })),
      }
    }),
  )

  return {
    repositories,
    contributors: mergeContributors(repositories),
  }
}

// Lists people new since the last run; contributors never leave the list.
export function formatContributorDiff(
  previous: Contributor[],
  current: Contributor[],
): string {
  const previousNames = new Set(previous.map((person) => person.name))
  const gained = current.filter((person) => !previousNames.has(person.name))

  if (gained.length === 0) {
    return `= No new contributors (${current.length})`
  }

  return [
    `Δ +${gained.length} new (${previous.length} → ${current.length})`,
    ...gained.map((person) => `  + ${person.name}`),
  ].join('\n')
}
