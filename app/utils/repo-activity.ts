import type { GitHubEvent } from '@unveil/identity/providers/github'

export type RepoActivity = {
  /** Full name, e.g. "owner/repo". */
  repo: string
  /** Newest first. */
  events: GitHubEvent[]
}

export type EventCategory = 'pull-requests' | 'issues' | 'code'

export type EventCategoryOption = {
  value: EventCategory
  label: string
}

/** Broad groups of event types, used to filter the list. */
const EVENT_CATEGORIES: Record<
  EventCategory,
  { label: string; types: string[] }
> = {
  'pull-requests': {
    label: 'Pull requests',
    types: [
      'PullRequestEvent',
      'PullRequestReviewEvent',
      'PullRequestReviewCommentEvent',
    ],
  },
  issues: {
    label: 'Issues',
    types: ['IssuesEvent', 'IssueCommentEvent'],
  },
  code: {
    label: 'Code',
    types: [
      'PushEvent',
      'CreateEvent',
      'DeleteEvent',
      'ReleaseEvent',
      'CommitCommentEvent',
    ],
  },
}

/** Plural, lowercase names used in summaries ("3 events · pull requests"). */
const EVENT_TYPE_LABELS: Record<string, string> = {
  PullRequestEvent: 'pull requests',
  PullRequestReviewEvent: 'reviews',
  PullRequestReviewCommentEvent: 'review comments',
  IssuesEvent: 'issues',
  IssueCommentEvent: 'comments',
  PushEvent: 'pushes',
  CreateEvent: 'branches',
  DeleteEvent: 'deletions',
  ForkEvent: 'forks',
  WatchEvent: 'stars',
  ReleaseEvent: 'releases',
  CommitCommentEvent: 'commit comments',
  MemberEvent: 'members',
  GollumEvent: 'wiki edits',
  DiscussionEvent: 'discussions',
}

/** How many event types a summary names before trailing off. */
const SUMMARY_TYPE_LIMIT = 3

export function getEventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/Event$/, '').toLowerCase()
}

function isInCategory(event: GitHubEvent, category: EventCategory): boolean {
  return EVENT_CATEGORIES[category].types.includes(event.type ?? '')
}

/**
 * The categories worth offering as filters: those that keep some of the
 * events but not all of them (otherwise picking one would change nothing).
 */
export function getEventCategories(
  events: GitHubEvent[],
): EventCategoryOption[] {
  const categories = Object.keys(EVENT_CATEGORIES) as EventCategory[]

  return categories
    .filter((category) => {
      const count = events.filter((event) =>
        isInCategory(event, category),
      ).length
      return count > 0 && count < events.length
    })
    .map((category) => ({
      value: category,
      label: EVENT_CATEGORIES[category].label,
    }))
}

/** Keeps the events in `category`; with no category, keeps them all. */
export function filterByCategory(
  events: GitHubEvent[],
  category?: EventCategory,
): GitHubEvent[] {
  if (!category) {
    return events
  }
  return events.filter((event) => isInCategory(event, category))
}

function timestamp(event: GitHubEvent): number {
  return Date.parse(event.created_at ?? '') || 0
}

/**
 * Groups events by repository. Events without a repository are skipped.
 * Busiest repositories come first; ties go to the most recently active.
 */
export function groupEventsByRepo(events: GitHubEvent[]): RepoActivity[] {
  const eventsByRepo = new Map<string, GitHubEvent[]>()

  for (const event of events) {
    const repo = event.repo?.name
    if (!repo) {
      continue
    }

    const repoEvents = eventsByRepo.get(repo) ?? []
    repoEvents.push(event)
    eventsByRepo.set(repo, repoEvents)
  }

  const groups = [...eventsByRepo].map(([repo, repoEvents]) => ({
    repo,
    events: repoEvents.toSorted((a, b) => timestamp(b) - timestamp(a)),
  }))

  return groups.sort((a, b) => {
    const byCount = b.events.length - a.events.length
    const newestA = a.events[0] ? timestamp(a.events[0]) : 0
    const newestB = b.events[0] ? timestamp(b.events[0]) : 0
    return byCount || newestB - newestA
  })
}

/** One line describing a list of events: "12 events · pull requests, comments". */
export function summarizeEvents(events: GitHubEvent[]): string {
  const countByType = new Map<string, number>()
  for (const event of events) {
    const type = event.type ?? ''
    countByType.set(type, (countByType.get(type) ?? 0) + 1)
  }

  const typesByFrequency = [...countByType]
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([type]) => getEventTypeLabel(type))

  const named = typesByFrequency.slice(0, SUMMARY_TYPE_LIMIT).join(', ')
  const more = typesByFrequency.length > SUMMARY_TYPE_LIMIT ? ', …' : ''
  const noun = events.length === 1 ? 'event' : 'events'

  return `${events.length} ${noun} · ${named}${more}`
}
