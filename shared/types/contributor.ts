export type Contributor = {
  id: number
  name: string
  avatar: string
  url: string
  contributions: number
}

export type Repository = {
  repo: string
  label: string
  url: string
  contributors: Contributor[]
}

export type ContributorsResponse = {
  repositories: Repository[]
  contributors: Contributor[]
}
