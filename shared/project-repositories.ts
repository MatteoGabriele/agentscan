export type ProjectRepository = {
  owner: string
  repo: string
  label: string
}

export const projectRepositories: ProjectRepository[] = [
  { owner: 'MatteoGabriele', repo: 'agentscan', label: 'agentscan' },
  {
    owner: 'MatteoGabriele',
    repo: 'agentscan-action',
    label: 'agentscan-action',
  },
  { owner: 'unveil-project', repo: 'identity', label: 'unveil/identity' },
]
