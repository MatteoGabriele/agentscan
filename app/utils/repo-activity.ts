import type { ActivityEvent, ActivityEventType } from '@unveil/identity'
import type { GitHubEvent } from '@unveil/identity/providers/github'

/** A GitHub event normalized by `fromGitHub`, keeping the raw event as `source`. */
export type RepoEvent = ActivityEvent<GitHubEvent>

export type RepoActivity = {
  /** Full name, e.g. "owner/repo". */
  repo: string
  /** Newest first. */
  events: RepoEvent[]
}

export type EventCategory = 'pull-requests' | 'issues' | 'code'

export type EventCategoryOption = {
  value: EventCategory
  label: string
}

/** Broad groups of event types, used to filter the list. */
const EVENT_CATEGORIES: Record<
  EventCategory,
  { label: string; types: ActivityEventType[] }
> = {
  'pull-requests': {
    label: 'Pull requests',
    types: ['pull-request', 'review', 'review-comment', 'review-thread'],
  },
  issues: {
    label: 'Issues',
    types: ['issue', 'issue-comment'],
  },
  code: {
    label: 'Code',
    types: ['push', 'create', 'delete', 'release', 'commit-comment'],
  },
}

/** Plural, lowercase names used in summaries ("3 events · pull requests"). */
const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  'pull-request': 'pull requests',
  review: 'reviews',
  'review-comment': 'review comments',
  'review-thread': 'review threads',
  issue: 'issues',
  'issue-comment': 'comments',
  push: 'pushes',
  create: 'branches',
  delete: 'deletions',
  fork: 'forks',
  star: 'stars',
  release: 'releases',
  'commit-comment': 'commit comments',
  member: 'members',
  public: 'made public',
  wiki: 'wiki edits',
  discussion: 'discussions',
  sponsorship: 'sponsorships',
}

/** How many event types a summary names before trailing off. */
const SUMMARY_TYPE_LIMIT = 3

/**
 * Types the provider doesn't know are passed through raw ("FooEvent"), so the
 * fallback strips the GitHub suffix.
 */
export function getEventTypeLabel(type: ActivityEventType): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/Event$/, '').toLowerCase()
}

function isInCategory(event: RepoEvent, category: EventCategory): boolean {
  return EVENT_CATEGORIES[category].types.includes(event.type)
}

/**
 * The categories worth offering as filters: those that keep some of the
 * events but not all of them (otherwise picking one would change nothing).
 */
export function getEventCategories(events: RepoEvent[]): EventCategoryOption[] {
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
  events: RepoEvent[],
  category?: EventCategory,
): RepoEvent[] {
  if (!category) {
    return events
  }
  return events.filter((event) => isInCategory(event, category))
}

function timestamp(event: RepoEvent): number {
  return Date.parse(event.at) || 0
}

/**
 * Groups events by repository. Events without a repository are skipped.
 * Busiest repositories come first; ties go to the most recently active.
 */
export function groupEventsByRepo(events: RepoEvent[]): RepoActivity[] {
  const eventsByRepo = new Map<string, RepoEvent[]>()

  for (const event of events) {
    const repo = event.repo
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
export function summarizeEvents(events: RepoEvent[]): string {
  const countByType = new Map<ActivityEventType, number>()
  for (const event of events) {
    countByType.set(event.type, (countByType.get(event.type) ?? 0) + 1)
  }

  const typesByFrequency = [...countByType]
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([type]) => getEventTypeLabel(type))

  const named = typesByFrequency.slice(0, SUMMARY_TYPE_LIMIT).join(', ')
  const more = typesByFrequency.length > SUMMARY_TYPE_LIMIT ? ', …' : ''
  const noun = events.length === 1 ? 'event' : 'events'

  return `${events.length} ${noun} · ${named}${more}`
}
