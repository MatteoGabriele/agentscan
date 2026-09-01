import type { AdopterRepository } from '../types/adopter-repository'

export type AdopterGroup = {
  owner: string
  avatar: string
  repositories: AdopterRepository[]
}

export function groupAdoptersByOwner(
  repositories: AdopterRepository[],
): AdopterGroup[] {
  const groups = new Map<string, AdopterGroup>()

  for (const repository of repositories) {
    const owner = repository.name.split('/')[0]

    if (!owner) {
      continue
    }

    const group = groups.get(owner)

    if (!group) {
      groups.set(owner, {
        owner,
        avatar: repository.avatar,
        repositories: [repository],
      })

      continue
    }

    group.repositories.push(repository)
  }

  for (const group of groups.values()) {
    group.repositories.sort((a, b) => {
      return b.stars - a.stars || a.name.localeCompare(b.name)
    })
  }

  return [...groups.values()].sort((a, b) => {
    return topStars(b) - topStars(a) || a.owner.localeCompare(b.owner)
  })
}

function topStars(group: AdopterGroup): number {
  return group.repositories[0]?.stars ?? 0
}

export function repositoryNameWithoutOwner(
  repository: AdopterRepository,
  owner: string,
): string {
  return repository.name.startsWith(`${owner}/`)
    ? repository.name.slice(owner.length + 1)
    : repository.name
}
