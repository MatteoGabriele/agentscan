import { findReportIssues } from '~~/shared/utils/report-issues'
import type { ReportIssue } from '~~/shared/utils/report-issues'

export const getReportIssues = defineCachedFunction(
  async (id: number): Promise<ReportIssue[]> => {
    const config = useRuntimeConfig()
    const octokit = createOctokit(config.githubToken)
    const { data } = await octokit.rest.search.issuesAndPullRequests({
      q: `repo:MatteoGabriele/agentscan is:issue label:automation in:body "GitHub User ID ${id}"`,
      per_page: 50,
    })

    return findReportIssues(data.items, id)
  },
  {
    name: 'report-issues',
    getKey: (id: number) => String(id),
    maxAge: 60 * 5,
  },
)
