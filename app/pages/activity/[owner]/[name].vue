<script setup lang="ts">
import type { ActivityCategory } from '~~/shared/types/activity'
import {
  classifyByScore,
  formatPercentage,
  formatProgressionPoints,
  getTrendArrow,
  getTrendColor,
} from '~~/shared/utils/activity-stats'
import {
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY,
  SWATCH,
} from '~~/shared/utils/charts'
import {
  REPO_REPORT_PERIOD_DAYS,
  REPO_REPORT_WINDOW_HOURS,
} from '~~/shared/utils/repo-report'

const MAX_PULL_REQUESTS = 10

const route = useRoute()
const isMobile = useIsMobile()

const repo = computed(() => `${route.params.owner}/${route.params.name}`)

const { data: report, status, error } = await useRepoReport(repo)

useHead({
  title: () => `${report.value?.repo ?? repo.value} activity | AgentScan`,
})

const classification = computed<ActivityCategory | undefined>(() => {
  const score = report.value?.current.score

  return score == null
    ? undefined
    : (classifyByScore(score) as ActivityCategory)
})

const { scoreStyle } = useScoreStyle(classification)
const { classificationIcon } = useClassificationIcons(classification)

// The classification describes who opens pull requests, never the project:
// popular repos attract automation through no fault of their own.
// Sometimes. Hopefully.
const SUMMARY: Record<ActivityCategory, { label: string; text: string }> = {
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

const summary = computed(() =>
  classification.value ? SUMMARY[classification.value] : null,
)

function roundScore(value: number | null | undefined) {
  return value == null ? null : Math.round(value)
}

const score = computed(() => roundScore(report.value?.current.score))

if (report.value) {
  const ogTitle = `${report.value.repo} activity | AgentScan`

  useHead({
    meta: [
      { property: 'og:title', content: ogTitle },
      {
        property: 'og:description',
        content:
          summary.value?.text ??
          `No pull requests scored in the last ${REPO_REPORT_PERIOD_DAYS} days.`,
      },
    ],
  })

  defineOgImage('RepoReport', {
    repo: report.value.repo,
    score: score.value ?? undefined,
    classification: classification.value,
    label: summary.value?.label,
    count: report.value.current.count,
    days: REPO_REPORT_PERIOD_DAYS,
  })
}

const scoreChange = computed(() => {
  const current = report.value?.current.score
  const previous = report.value?.previous?.score

  return current == null || previous == null ? null : current - previous
})

const ecosystemScore = computed(() => roundScore(report.value?.ecosystemScore))

// Built here rather than in the template: Volar rewrites `//` in component
// props as a comment, which breaks type checking for the rest of the template.
const repoUrl = computed(() => `https://github.com/${report.value?.repo}`)

const trackedSince = computed(
  () => report.value?.days.find((day) => day.count > 0)?.date,
)

const windowShares = computed(() => {
  const window = report.value?.window

  if (!window?.total) {
    return []
  }

  return CLASSIFICATIONS_WITH_NAME_AND_CATEGORY.map(({ name, category }) => ({
    name,
    category,
    count: window.counts[category],
    percentage: formatPercentage(
      (window.counts[category] / window.total) * 100,
    ),
  }))
})

const showAllPullRequests = ref(false)

const allPullRequests = computed(() => report.value?.window.pullRequests ?? [])

const pullRequests = computed(() => {
  return showAllPullRequests.value
    ? allPullRequests.value
    : allPullRequests.value.slice(0, MAX_PULL_REQUESTS)
})

const hasHiddenPullRequests = computed(() => {
  return pullRequests.value.length < allPullRequests.value.length
})

const classificationNames = Object.fromEntries(
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY.map(({ name, category }) => [
    category,
    name,
  ]),
) as Record<ActivityCategory, string>

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(new Date(date))
}
</script>

<template>
  <h1 class="sr-only">{{ repo }} activity report</h1>

  <p class="mb-6">
    <NuxtLink
      to="/activity/repositories"
      class="inline-flex items-center gap-1 text-sm text-ui-muted hover:text-ui-text"
    >
      <span class="i-lucide:arrow-left" aria-hidden="true" />
      Tracked repositories
    </NuxtLink>
  </p>

  <div v-if="status === 'pending'" class="flex flex-col gap-4">
    <Skeleton width="w-64" height="h-8" />
    <Skeleton width="w-full" height="h-40" />
  </div>

  <div v-else-if="error" class="text-center py-12 text-ui-muted">
    <p v-if="error.status === 404" class="text-sm text-pretty">
      <span class="text-ui-text font-medium">{{ repo }}</span> is not one of the
      <NuxtLink to="/activity/repositories" class="underline"
        >repositories we track</NuxtLink
      >.
      <NuxtLink :to="`/scan/${repo}`" class="underline"
        >Scan its latest pull requests</NuxtLink
      >
      instead.
    </p>
    <p v-else class="text-sm">{{ error.message }}</p>
  </div>

  <div v-else-if="report" class="flex flex-col gap-12">
    <div
      class="flex flex-col gap-6 bg-ui-card py-4 md:py-6 rounded-2 border-2 border-solid"
      :class="scoreStyle.border"
    >
      <header
        class="px-6 flex flex-col gap-1 md:flex-row md:items-center md:justify-between md:gap-2"
      >
        <NuxtLink
          :to="repoUrl"
          external
          target="_blank"
          class="flex items-center gap-2 text-lg font-semibold hover:underline"
        >
          <span class="i-lucide:book-marked text-ui-muted" aria-hidden="true" />
          {{ report.repo }}
        </NuxtLink>
        <p v-if="trackedSince" class="text-xs text-ui-muted">
          Tracked since {{ formatDate(trackedSince) }}
        </p>
      </header>

      <div
        class="fade-divider mx-6 h-px opacity-35"
        :class="scoreStyle.background"
        aria-hidden="true"
      />

      <section
        class="px-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
      >
        <div v-if="summary" class="flex flex-col gap-1 max-w-sm">
          <div class="flex gap-2 items-center" :class="scoreStyle.text">
            <span :class="classificationIcon" class="text-base" />
            <h2 class="text-xl font-mono">{{ summary.label }}</h2>
          </div>
          <p class="text-ui-text text-pretty">{{ summary.text }}</p>
          <p class="text-xs text-ui-muted text-pretty">
            This reflects the accounts opening pull requests, not the project or
            its maintainers.
          </p>
        </div>
        <p v-else class="text-ui-muted">
          No pull requests scored in the last
          {{ REPO_REPORT_PERIOD_DAYS }} days.
        </p>

        <div v-if="score !== null" class="shrink-0 md:text-right">
          <p class="font-mono tabular-nums">
            <span class="text-5xl" :class="scoreStyle.text">{{ score }}</span>
            <span class="text-ui-muted">/100</span>
          </p>
          <p class="text-xs text-ui-muted">
            Contributor score, last {{ REPO_REPORT_PERIOD_DAYS }} days
          </p>
        </div>
      </section>

      <dl
        class="mx-6 pt-4 border-t border-ui-border-subtle grid grid-cols-3 gap-4 text-sm"
      >
        <div class="flex flex-col justify-between">
          <dt class="text-ui-muted">PRs scored</dt>
          <dd class="tabular-nums">
            {{ report.current.count.toLocaleString('en') }}
          </dd>
        </div>
        <div class="flex flex-col justify-between">
          <dt class="text-ui-muted">
            vs previous {{ REPO_REPORT_PERIOD_DAYS }} days
          </dt>
          <dd v-if="scoreChange === null">–</dd>
          <dd
            v-else
            class="tabular-nums"
            :class="getTrendColor({ value: scoreChange })"
          >
            <span
              :class="getTrendArrow(scoreChange)"
              class="align-middle"
              aria-hidden="true"
            />
            {{ formatProgressionPoints(scoreChange) }}
          </dd>
        </div>
        <div class="flex flex-col justify-between">
          <dt class="text-ui-muted">Ecosystem average</dt>
          <dd class="tabular-nums">{{ ecosystemScore ?? '–' }}</dd>
        </div>
      </dl>
    </div>

    <!-- Too dense to read at phone width, so it's left out entirely. -->
    <section v-if="!isMobile" class="hidden md:flex flex-col gap-4">
      <header>
        <h2 class="font-semibold">Daily score</h2>
        <p class="text-sm text-ui-muted text-pretty">
          Average score of each day's pull requests. The dotted line is daily
          volume.
        </p>
      </header>
      <LazyChartRepoDailyScore :days="report.days" />
    </section>

    <section class="flex flex-col gap-4">
      <header class="flex items-baseline justify-between gap-2">
        <div>
          <h2 class="font-semibold">
            Last {{ REPO_REPORT_WINDOW_HOURS }} hours
          </h2>
          <p class="text-sm text-ui-muted">
            {{ report.window.total }} pull requests scored
          </p>
        </div>
        <NuxtLink :to="`/scan/${report.repo}`" class="text-sm underline"
          >Scan latest authors</NuxtLink
        >
      </header>

      <template v-if="windowShares.length">
        <div
          class="flex h-2 w-full overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <span
            v-for="share in windowShares"
            :key="share.category"
            :class="SWATCH[share.category]"
            :style="{ width: `${share.percentage}%` }"
          />
        </div>

        <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li
            v-for="share in windowShares"
            :key="share.category"
            class="flex items-center gap-2"
          >
            <span
              :class="SWATCH[share.category]"
              class="size-2 block rounded-full"
            />
            {{ share.name }}
            <span class="text-ui-muted tabular-nums"
              >{{ share.percentage }}% ({{ share.count }})</span
            >
          </li>
        </ul>

        <ul
          class="flex flex-col divide-y divide-ui-border-subtle border-y border-ui-border-subtle text-sm"
        >
          <li
            v-for="(pullRequest, index) in pullRequests"
            :key="pullRequest.pr ?? index"
            class="flex items-center justify-between gap-4 py-2"
          >
            <div class="flex items-center gap-2">
              <span
                :class="SWATCH[pullRequest.classification]"
                class="size-2 block rounded-full"
              />
              <NuxtLink
                v-if="pullRequest.pr"
                :to="`${repoUrl}/pull/${pullRequest.pr}`"
                external
                target="_blank"
                class="underline tabular-nums"
              >
                #{{ pullRequest.pr }}
              </NuxtLink>
              <span class="text-ui-muted">
                {{ classificationNames[pullRequest.classification] }}
              </span>
            </div>
            <NuxtTime
              :datetime="pullRequest.createdAt"
              relative
              class="text-ui-muted text-xs"
            />
          </li>
        </ul>

        <button
          v-if="hasHiddenPullRequests"
          class="self-start text-sm text-ui-muted/70 hover:text-ui-text"
          @click="showAllPullRequests = true"
        >
          Show all
        </button>
      </template>
      <p v-else class="text-sm text-ui-muted">
        No pull requests scored in the last
        {{ REPO_REPORT_WINDOW_HOURS }} hours.
      </p>
    </section>
  </div>
</template>
