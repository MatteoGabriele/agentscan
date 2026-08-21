import { Octokit } from 'octokit'

export function createOctokit(auth?: string) {
  return new Octokit({ auth })
}
