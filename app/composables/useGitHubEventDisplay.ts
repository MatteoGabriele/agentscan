// @unocss-include
import type { GitHubEvent } from '@unveil/identity'
import dayjs from 'dayjs'

const ZERO_SHA = '0000000000000000000000000000000000000000'

const EVENT_ICONS: [string[], string][] = [
  [['PullRequestEvent'], 'i-lucide:git-pull-request'],
  [['PushEvent'], 'i-lucide:upload'],
  [['CreateEvent'], 'i-lucide:git-branch'],
  [['DeleteEvent'], 'i-lucide:trash-2'],
  [['ForkEvent'], 'i-lucide:git-fork'],
  [['WatchEvent'], 'i-lucide:star'],
  [
    ['IssueCommentEvent', 'PullRequestReviewCommentEvent'],
    'i-lucide:message-square',
  ],
  [['IssuesEvent'], 'i-lucide:circle-dot'],
  [['PullRequestReviewEvent'], 'i-lucide:eye'],
  [['ReleaseEvent'], 'i-lucide:tag'],
  [['CommitCommentEvent'], 'i-lucide:message-circle'],
  [['MemberEvent'], 'i-lucide:user-plus'],
]

export function useGitHubEventDisplay() {
  function getEventIcon(event: GitHubEvent): string {
    return (
      EVENT_ICONS.find(([types]) => types.includes(event.type ?? ''))?.[1] ??
      'i-lucide:activity'
    )
  }

  function getEventDescription(event: GitHubEvent): string {
    const payload = event.payload as Record<string, unknown> | undefined
    switch (event.type) {
      case 'PullRequestEvent': {
        const action = payload?.action as string | undefined
        const pr = payload?.pull_request as { number?: number } | undefined
        return pr?.number
          ? `PR #${pr.number} ${action ?? ''}`.trim()
          : `Pull request ${action ?? ''}`.trim()
      }
      case 'PushEvent': {
        const commits =
          (payload?.size as number) ??
          (payload?.commits as unknown[])?.length ??
          0
        const ref = (payload?.ref as string)?.replace('refs/heads/', '') ?? ''
        return ref
          ? `${commits} commit${commits !== 1 ? 's' : ''} → ${ref}`
          : `${commits} commit${commits !== 1 ? 's' : ''}`
      }
      case 'CreateEvent': {
        const refType = payload?.ref_type as string | undefined
        const ref = payload?.ref as string | undefined
        return ref
          ? `${refType} created: ${ref}`
          : `${refType ?? 'ref'} created`
      }
      case 'DeleteEvent': {
        const refType = payload?.ref_type as string | undefined
        const ref = payload?.ref as string | undefined
        return ref
          ? `${refType} deleted: ${ref}`
          : `${refType ?? 'ref'} deleted`
      }
      case 'ForkEvent': {
        const forkee = payload?.forkee as { full_name?: string } | undefined
        return forkee?.full_name ? `forked → ${forkee.full_name}` : 'forked'
      }
      case 'WatchEvent':
        return 'starred'
      case 'IssueCommentEvent': {
        const issue = payload?.issue as { number?: number } | undefined
        return issue?.number ? `comment on #${issue.number}` : 'issue comment'
      }
      case 'IssuesEvent': {
        const action = payload?.action as string | undefined
        const issue = payload?.issue as { number?: number } | undefined
        return issue?.number
          ? `issue #${issue.number} ${action ?? ''}`.trim()
          : `issue ${action ?? ''}`.trim()
      }
      case 'PullRequestReviewEvent': {
        const pr = payload?.pull_request as { number?: number } | undefined
        return pr?.number ? `reviewed PR #${pr.number}` : 'PR review'
      }
      case 'PullRequestReviewCommentEvent': {
        const pr = payload?.pull_request as { number?: number } | undefined
        return pr?.number ? `comment on PR #${pr.number}` : 'PR comment'
      }
      case 'ReleaseEvent': {
        const release = payload?.release as { tag_name?: string } | undefined
        return release?.tag_name ? `released ${release.tag_name}` : 'release'
      }
      default:
        return event.type?.replace('Event', '') ?? 'event'
    }
  }

  function getEventUrl(event: GitHubEvent): string | undefined {
    const repo = event.repo?.name
    const payload = event.payload as Record<string, unknown> | undefined
    if (!repo) {
      return undefined
    }
    const base = `https://github.com/${repo}`
    switch (event.type) {
      case 'PullRequestEvent':
      case 'PullRequestReviewEvent':
      case 'PullRequestReviewCommentEvent': {
        const pr = payload?.pull_request as { number?: number } | undefined
        return pr?.number ? `${base}/pull/${pr.number}` : undefined
      }
      case 'PushEvent': {
        const sha = (payload?.head ?? payload?.after) as string | undefined
        return sha && sha !== ZERO_SHA ? `${base}/commit/${sha}` : undefined
      }
      case 'IssueCommentEvent': {
        const issue = payload?.issue as { number?: number } | undefined
        const comment = payload?.comment as { id?: number } | undefined
        if (!issue?.number) {
          return undefined
        }
        return comment?.id
          ? `${base}/issues/${issue.number}#issuecomment-${comment.id}`
          : `${base}/issues/${issue.number}`
      }
      case 'CommitCommentEvent': {
        const comment = payload?.comment as
          | { commit_id?: string; id?: number }
          | undefined
        if (!comment?.commit_id) {
          return undefined
        }
        return comment.id
          ? `${base}/commit/${comment.commit_id}#commitcomment-${comment.id}`
          : `${base}/commit/${comment.commit_id}`
      }
      default:
        return undefined
    }
  }

  function formatEventTime(date: string | null | undefined): string {
    if (!date) {
      return ''
    }
    return dayjs(date).format('MMM D, h:mm a')
  }

  function getDeltaSeconds(a: GitHubEvent, b: GitHubEvent): number {
    return dayjs(b.created_at ?? 0).diff(dayjs(a.created_at ?? 0), 'second')
  }

  function sortByTime(evts: GitHubEvent[]): GitHubEvent[] {
    return [...evts].sort(
      (a, b) =>
        dayjs(a.created_at ?? 0).valueOf() - dayjs(b.created_at ?? 0).valueOf(),
    )
  }

  function getRapidBurst(
    evts: GitHubEvent[],
  ): { count: number; spanSeconds: number } | null {
    if (evts.length < 3) {
      return null
    }
    const sorted = sortByTime(evts)
    const first = sorted.at(0)
    const last = sorted.at(-1)
    if (!first || !last) {
      return null
    }
    const spanSeconds = dayjs(last.created_at ?? 0).diff(
      dayjs(first.created_at ?? 0),
      'second',
    )
    if (spanSeconds / (sorted.length - 1) < 120) {
      return { count: sorted.length, spanSeconds }
    }
    return null
  }

  function formatSpan(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }

  function groupEvents(
    events: GitHubEvent[],
  ): { icon: string; events: GitHubEvent[] }[] {
    const groups: { icon: string; events: GitHubEvent[] }[] = []
    for (const ev of events) {
      const icon = getEventIcon(ev)
      const last = groups[groups.length - 1]
      if (last && last.icon === icon) {
        last.events.push(ev)
      } else {
        groups.push({ icon, events: [ev] })
      }
    }
    return groups
  }

  return {
    getEventIcon,
    getEventDescription,
    getEventUrl,
    formatEventTime,
    groupEvents,
    getDeltaSeconds,
    sortByTime,
    getRapidBurst,
    formatSpan,
  }
}
