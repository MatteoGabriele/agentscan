<script setup lang="ts">
import type { RepoReport } from '~~/shared/types/repo-report'
import {
  formatProgressionPoints,
  getTrendArrow,
} from '~~/shared/utils/activity-stats'
import { REPO_REPORT_PERIOD_DAYS } from '~~/shared/utils/repo-report'

const props = defineProps<{
  report: RepoReport
}>()

const { classification, summary, score, scoreChange, ecosystemScore } =
  useRepoReportSummary(() => props.report)

const { scoreStyle } = useScoreStyle(classification)
const { classificationIcon } = useClassificationIcons(classification)

// A label/value row on phones, a column of three from `sm` up.
const STAT_CLASS =
  'flex items-baseline justify-between gap-x-4 sm:flex-col sm:items-stretch'
</script>

<template>
  <div
    class="flex flex-col gap-6 bg-ui-card py-4 md:py-6 rounded-2 border-2 border-solid"
    :class="scoreStyle.border"
  >
    <section
      class="px-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
    >
      <div v-if="summary" class="flex flex-col gap-1 max-w-sm">
        <!-- Read first, so this window isn't taken for the latest pull requests. -->
        <p class="text-xs text-ui-muted">
          Past {{ REPO_REPORT_PERIOD_DAYS }} days
        </p>
        <div class="flex gap-2 items-center" :class="scoreStyle.text">
          <span
            :class="classificationIcon"
            class="text-base"
            aria-hidden="true"
          />
          <h2 class="text-xl font-mono">{{ summary.label }}</h2>
        </div>
        <p class="text-ui-text text-pretty">{{ summary.text }}</p>
        <p class="text-xs text-ui-muted text-pretty">
          This reflects the accounts opening pull requests, not the project or
          its maintainers.
        </p>
      </div>
      <p v-else class="text-ui-muted">
        No pull requests scored in the past {{ REPO_REPORT_PERIOD_DAYS }} days.
      </p>

      <div v-if="score !== null" class="shrink-0 md:text-right">
        <p class="font-mono tabular-nums">
          <span class="text-5xl" :class="scoreStyle.text">{{ score }}</span>
          <span class="text-ui-muted">/100</span>
        </p>
        <p class="text-xs text-ui-muted">
          Contributor score, past {{ REPO_REPORT_PERIOD_DAYS }} days
        </p>
      </div>
    </section>

    <dl
      class="mx-6 pt-4 border-t border-ui-border-subtle grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 text-sm"
    >
      <div :class="STAT_CLASS">
        <dt class="text-ui-muted">Pull requests</dt>
        <dd class="tabular-nums">
          {{ report.current.count.toLocaleString('en') }}
        </dd>
      </div>
      <div :class="STAT_CLASS">
        <dt class="text-ui-muted">
          vs previous {{ REPO_REPORT_PERIOD_DAYS }} days
        </dt>
        <dd v-if="scoreChange === null">–</dd>
        <dd v-else class="tabular-nums">
          <span
            :class="getTrendArrow(scoreChange)"
            class="align-middle"
            aria-hidden="true"
          />
          {{ formatProgressionPoints(scoreChange) }}
        </dd>
      </div>
      <div :class="STAT_CLASS">
        <dt class="text-ui-muted">Ecosystem average</dt>
        <dd class="tabular-nums">{{ ecosystemScore ?? '–' }}</dd>
      </div>
    </dl>
  </div>
</template>
