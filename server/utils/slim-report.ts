import type { ActivityEvent } from '@unveil/identity'
import type { GitHubEvent } from '@unveil/identity/providers/github'
import type { Report } from '@unveil/identity/report'

function pick(
  source: unknown,
  keys: string[],
): Record<string, unknown> | undefined {
  if (!source || typeof source !== 'object') {
    return undefined
  }

  const entries = keys.flatMap((key) => {
    const value = (source as Record<string, unknown>)[key]
    return value === undefined || value === null ? [] : [[key, value]]
  })

  return entries.length ? Object.fromEntries(entries) : undefined
}

/** Trims a GitHub event to the fields the account page reads (charts and flag evidence). */
export function slimGitHubEvent(event: GitHubEvent): GitHubEvent {
  const payload = event.payload as Record<string, unknown> | undefined
  const commits = payload?.commits

  return {
    type: event.type,
    created_at: event.created_at,
    repo: pick(event.repo, ['name']),
    payload: {
      ...pick(payload, ['action', 'ref', 'ref_type', 'size', 'head', 'after']),
      // Push events without `size` fall back to the commit count.
      ...(payload?.size === undefined && Array.isArray(commits)
        ? { size: commits.length }
        : {}),
      pull_request: pick(payload?.pull_request, ['number']),
      issue: pick(payload?.issue, ['number']),
      comment: pick(payload?.comment, ['id', 'commit_id']),
      forkee: pick(payload?.forkee, ['full_name']),
      release: pick(payload?.release, ['tag_name']),
    },
  } as GitHubEvent
}

function slimActivityEvent(event: ActivityEvent): ActivityEvent {
  return {
    ...event,
    source: event.source
      ? slimGitHubEvent(event.source as GitHubEvent)
      : undefined,
  }
}

/** Keeps flag evidence, trimmed to what the evidence list displays. */
export function slimReport(report: Report): Report {
  return {
    ...report,
    flags: report.flags.map((flag) => ({
      ...flag,
      events: flag.events.map(slimActivityEvent),
      connections: flag.connections?.map((connection) => ({
        ...connection,
        from: slimActivityEvent(connection.from),
        to: slimActivityEvent(connection.to),
      })),
    })),
  }
}

/** Drops flag evidence, for views that only show the classification. */
export function withoutEvidence(report: Report): Report {
  return {
    ...report,
    flags: report.flags.map((flag) => ({
      ...flag,
      events: [],
      connections: undefined,
    })),
  }
}
