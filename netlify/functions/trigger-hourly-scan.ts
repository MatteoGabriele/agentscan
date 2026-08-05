const REPOSITORY =
  process.env.GITHUB_SCAN_REPOSITORY || 'MatteoGabriele/agentscan'
const WORKFLOW_FILE = 'scan-users-hourly.yml'
const REF = process.env.GITHUB_SCAN_REF || 'main'

export default async () => {
  const token = process.env.GITHUB_WORKFLOW_DISPATCH_TOKEN

  if (!token) {
    console.error('Missing GitHub token, cannot dispatch the hourly scan')
    return new Response('Missing workflow dispatch token', { status: 500 })
  }

  const url = `https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW_FILE}/dispatches`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'agentscan-scheduler',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify({ ref: REF }),
  })

  if (!response.ok) {
    const detail = await response.text()
    console.error(
      `Failed to dispatch ${WORKFLOW_FILE}: ${response.status} ${detail}`,
    )

    return new Response('Failed to dispatch workflow', { status: 502 })
  }

  console.log(`Dispatched ${WORKFLOW_FILE} on ${REPOSITORY}@${REF}`)
  return new Response(null, { status: 204 })
}
