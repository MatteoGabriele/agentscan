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

export type EventLabel = Lowercase<string>

/** Plural names used in summaries ("3 events · pull requests"). */
const EVENT_TYPE_LABELS: Record<ActivityEventType, EventLabel> = {
  'pull-request': 'pull requests',
  review: 'reviews',
  'review-comment': 'review comments',
  'review-thread': 'review threads',
  issue: 'issues',
  'issue-comment': 'comments',
  push: 'pushes',
  create: 'branches and tags',
  delete: 'deleted branches',
  fork: 'forks',
  star: 'stars',
  release: 'releases',
  'commit-comment': 'commit comments',
  member: 'members',
  public: 'repositories made public',
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
export function getEventTypeLabel(type: ActivityEventType): EventLabel {
  return (
    EVENT_TYPE_LABELS[type] ??
    (type.replace(/Event$/, '').toLowerCase() as EventLabel)
  )
}

/**
 * GitHub reports comments on a pull request's conversation as issue comments,
 * marking them with `issue.pull_request`.
 */
function isPullRequestComment(event: RepoEvent): boolean {
  const payload = event.source?.payload as
    { issue?: { pull_request?: unknown } } | undefined
  return event.type === 'issue-comment' && !!payload?.issue?.pull_request
}

/** The category an event belongs to, if any. */
function getEventCategory(event: RepoEvent): EventCategory | undefined {
  if (isPullRequestComment(event)) {
    return 'pull-requests'
  }
  const categories = Object.keys(EVENT_CATEGORIES) as EventCategory[]
  return categories.find((category) =>
    EVENT_CATEGORIES[category].types.includes(event.type),
  )
}

/** Whether `event` belongs to `category`. */
function isInCategory(event: RepoEvent, category: EventCategory): boolean {
  return getEventCategory(event) === category
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

/** The event's time in milliseconds; 0 when it can't be parsed. */
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

export type EventTypeSummary = {
  /** The event type, or for pull requests the type plus what was done ("pull-request:merged"). */
  key: string
  type: ActivityEventType
  /** Plural ("pushes", "merged pull requests"); rows capitalize it for display. */
  label: EventLabel
  count: number
  /** Fraction of all events, from 0 to 1. */
  share: number
  /** Distinct repositories the type appears in. */
  repoCount: number
  /** Time of the newest event of this type. */
  newestAt: string
}

/** Below this many events, percentages say more than the data does. */
export const MIN_EVENTS_FOR_SHARE = 5

/** A second type is named in the breakdown only when it holds at least this share. */
const SECOND_TYPE_MIN_SHARE = 0.15

const DAY_MS = 24 * 60 * 60 * 1000

type PullRequestAction = 'opened' | 'merged' | 'closed'

const PULL_REQUEST_ACTION_LABELS: Record<PullRequestAction, EventLabel> = {
  opened: 'opened pull requests',
  merged: 'merged pull requests',
  closed: 'closed pull requests',
}

/**
 * What this account did to a pull request. GitHub now sends `merged` as its own
 * action; older events said `closed` with `pull_request.merged`. Labeling,
 * reopening and other edits return undefined.
 */
function getPullRequestAction(event: RepoEvent): PullRequestAction | undefined {
  const payload = event.source?.payload as
    { action?: string; pull_request?: { merged?: boolean | null } } | undefined
  const action = payload?.action
  if (action === 'merged') {
    return 'merged'
  }
  if (action === 'closed') {
    return payload?.pull_request?.merged === true ? 'merged' : 'closed'
  }
  return action === 'opened' ? 'opened' : undefined
}

/** The row an event is counted in; pull requests split by action. */
function getEventKind(event: RepoEvent): { key: string; label: EventLabel } {
  if (event.type !== 'pull-request') {
    return { key: event.type, label: getEventTypeLabel(event.type) }
  }
  const action = getPullRequestAction(event)
  return action
    ? {
        key: `pull-request:${action}`,
        label: PULL_REQUEST_ACTION_LABELS[action],
      }
    : { key: 'pull-request', label: 'other pull request updates' }
}

/**
 * Counts events by type, splitting pull requests into opened, merged, closed and
 * other updates. The most frequent types come first; ties go to the
 * most recently seen.
 */
export function summarizeEventTypes(events: RepoEvent[]): EventTypeSummary[] {
  const byKind = new Map<
    string,
    { label: EventLabel; count: number; repos: Set<string>; newest: RepoEvent }
  >()

  for (const event of events) {
    const { key, label } = getEventKind(event)
    const entry = byKind.get(key)
    if (!entry) {
      byKind.set(key, {
        label,
        count: 1,
        repos: new Set(event.repo ? [event.repo] : []),
        newest: event,
      })
      continue
    }

    entry.count += 1
    if (event.repo) {
      entry.repos.add(event.repo)
    }
    if (timestamp(event) > timestamp(entry.newest)) {
      entry.newest = event
    }
  }

  return [...byKind]
    .map(([key, { label, count, repos, newest }]) => ({
      key,
      type: newest.type,
      label,
      count,
      share: count / events.length,
      repoCount: repos.size,
      newestAt: newest.at,
    }))
    .sort((a, b) => {
      const byCount = b.count - a.count
      return byCount || Date.parse(b.newestAt) - Date.parse(a.newestAt) || 0
    })
}

/** Days between the oldest and newest event; 0 with fewer than two. */
export function getEventSpanDays(events: RepoEvent[]): number {
  const times = events.map(timestamp).filter((time) => time > 0)
  if (times.length < 2) {
    return 0
  }
  return (Math.max(...times) - Math.min(...times)) / DAY_MS
}

/** A share as a whole percentage, "<1%" when it would round to zero. */
export function formatEventShare(share: number): string {
  const percent = Math.round(share * 100)
  return share > 0 && percent < 1 ? '<1%' : `${percent}%`
}

function describeSpan(spanDays: number): string {
  if (spanDays < 1) {
    return 'within a day'
  }
  const days = Math.round(spanDays)
  return `over ${days} ${days === 1 ? 'day' : 'days'}`
}

/**
 * One sentence on what kind of activity the events are, from the output of
 * `summarizeEventTypes`: "Mostly pull requests (46%) and comments, over 23 days".
 */
export function describeActivityBreakdown(
  types: EventTypeSummary[],
  spanDays: number,
): string {
  const [top, second] = types
  if (!top) {
    return ''
  }

  const total = types.reduce((sum, { count }) => sum + count, 0)

  if (total === 1) {
    return `A single event: ${top.label}`
  }

  const span = describeSpan(spanDays)

  if (!second) {
    const all = total === 2 ? 'Both events are' : `All ${total} events are`
    return `${all} ${top.label}, ${span}`
  }

  const showShare = total >= MIN_EVENTS_FOR_SHARE
  const topShare = showShare ? ` (${formatEventShare(top.share)})` : ''
  const secondPart =
    second.share >= SECOND_TYPE_MIN_SHARE ? ` and ${second.label}` : ''

  return `Mostly ${top.label}${topShare}${secondPart}, ${span}`
}
