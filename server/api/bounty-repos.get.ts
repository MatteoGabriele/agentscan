import { Octokit } from 'octokit'
import type { BountyRepo } from '~~/shared/types/bounty'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const octokit = new Octokit({ auth: config.githubToken })

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: 'matteogabriele',
      repo: 'agentscan',
      path: 'data/bounty-repos.json',
    })

    if ('content' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8')
      return JSON.parse(content) as BountyRepo[]
    }

    return []
  } catch {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch bounty repos list',
    })
  }
})
