import { toPendingReports } from '~~/shared/utils/pending-reports'
import type { PendingReport } from '~~/shared/utils/pending-reports'

export const getPendingReports = defineCachedFunction(
  async (): Promise<PendingReport[]> => {
    const config = useRuntimeConfig()
    const octokit = createOctokit(config.githubToken)
    const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner: 'MatteoGabriele',
      repo: 'agentscan',
      state: 'open',
      labels: 'automation:pending',
      per_page: 100,
    })

    return toPendingReports(issues)
  },
  {
    name: 'pending-reports',
    maxAge: 60 * 5,
  },
)
