export type Contributor = {
  id: number
  name: string
  avatar: string
  url: string
  contributions: number
}

export type RepositoryContributors = {
  repo: string
  label: string
  url: string
  contributors: Contributor[]
}
