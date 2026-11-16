export type PinnedRelease = {
  tag: string
  sha: string
  url: string
}

export type ActionReleasesResponse = {
  agentscan: PinnedRelease
  cache: PinnedRelease
}
