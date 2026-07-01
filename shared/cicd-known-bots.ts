export const knownBots = [
  'agentscanapp',
  'copilot',
  'dependabot',
  'renovate',
  'greenkeeper',
  'github-actions',
  'stale',
  'snyk',
  'codecov',
  'coveralls',
  'travis',
  'circle',
  'appveyor',
  'azure-pipelines',
  'netlify',
  'vercel',
  'heroku',
  'aws-amplify',
  'eslintbot',
]

export function isKnownBot(username: string): boolean {
  const lower = username.toLowerCase()
  return (
    knownBots.some((name) => lower.includes(name)) || lower.endsWith('[bot]')
  )
}
