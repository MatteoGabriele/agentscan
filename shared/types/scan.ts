import type { ClassificationLabel } from '@unveil/identity'

export type PullRequestState = 'open' | 'closed' | 'merged'

export type PullRequestAuthor = {
  login: string
  avatarUrl?: string
}

/** One pull request from a live repository scan, as its list row shows it. */
export type PullRequestRowData = {
  number: number
  url: string
  title: string
  createdAt: string
  state: PullRequestState
  classification: ClassificationLabel
  author: PullRequestAuthor
  communityReported: boolean
}
