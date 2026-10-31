import type {
  ActionReleasesResponse,
  PinnedRelease,
} from '~~/shared/types/action-release'

// The config generator pins workflow steps to a commit SHA rather than a tag:
// a tag can be moved to point at different code, a SHA cannot.
async function getLatestRelease(
  octokit: ReturnType<typeof createOctokit>,
  owner: string,
  repo: string,
): Promise<PinnedRelease> {
  const { data: release } = await octokit.rest.repos.getLatestRelease({
    owner,
    repo,
  })

  // Resolves annotated tags to the commit they point at.
  const { data: commit } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: release.tag_name,
  })

  return { tag: release.tag_name, sha: commit.sha, url: release.html_url }
}

export default defineCachedEventHandler(
  async (): Promise<ActionReleasesResponse> => {
    const config = useRuntimeConfig()
    const octokit = createOctokit(config.githubToken)

    try {
      const [agentscan, cache] = await Promise.all([
        getLatestRelease(octokit, 'MatteoGabriele', 'agentscan-action'),
        getLatestRelease(octokit, 'actions', 'cache'),
      ])

      return { agentscan, cache }
    } catch {
      throw createError({
        status: 502,
        message: 'Failed to fetch the latest GitHub Action releases.',
      })
    }
  },
  {
    maxAge: 60 * 60,
  },
)
