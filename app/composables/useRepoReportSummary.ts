import type { ActivityCategory } from '~~/shared/types/activity'
import type { RepoReport } from '~~/shared/types/repo-report'
import { classifyByScore } from '~~/shared/utils/activity-stats'

type RepoReportSummary = {
  label: string
  text: string
}

// The classification describes who opens pull requests, never the project:
// popular repos attract automation through no fault of their own.
// Sometimes. Hopefully.
const SUMMARY: Record<ActivityCategory, RepoReportSummary> = {
  organic: {
    label: 'Organic contributions',
    text: 'Most pull requests here come from accounts with human activity patterns.',
  },
  mixed: {
    label: 'Some automation pressure',
    text: 'A noticeable share of pull requests here come from accounts with automation patterns.',
  },
  automation: {
    label: 'Targeted by automation',
    text: 'Most pull requests here come from accounts with automation patterns.',
  },
}

function roundScore(value: number | null | undefined): number | null {
  return value == null ? null : Math.round(value)
}

/** The 30-day classification of a tracked repo, shared by its card and its social preview. */
export function useRepoReportSummary(
  report: MaybeRefOrGetter<RepoReport | null | undefined>,
) {
  const classification = computed<ActivityCategory | undefined>(() => {
    const score = toValue(report)?.current.score

    if (score == null) {
      return undefined
    }

    const label = classifyByScore(score)

    return label === 'insufficient-data' ? undefined : label
  })

  const summary = computed<RepoReportSummary | null>(() =>
    classification.value ? SUMMARY[classification.value] : null,
  )

  const score = computed<number | null>(() =>
    roundScore(toValue(report)?.current.score),
  )

  const scoreChange = computed<number | null>(() => {
    const current = toValue(report)?.current.score
    const previous = toValue(report)?.previous?.score

    return current == null || previous == null ? null : current - previous
  })

  const ecosystemScore = computed<number | null>(() =>
    roundScore(toValue(report)?.ecosystemScore),
  )

  return { classification, summary, score, scoreChange, ecosystemScore }
}
