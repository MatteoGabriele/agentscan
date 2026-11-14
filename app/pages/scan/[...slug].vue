<script setup lang="ts">
import {
  parseScanPath,
  type SearchTarget,
} from '~~/shared/utils/parse-search-target'
import {
  getTrackedSince,
  REPO_REPORT_PERIOD_DAYS,
} from '~~/shared/utils/repo-report'

const route = useRoute()

const path = computed<string>(() => {
  const { slug } = route.params

  return Array.isArray(slug) ? slug.join('/') : (slug ?? '')
})

const target = computed<SearchTarget | null>(() => parseScanPath(path.value))

// A single segment names an account, which has its own page.
if (target.value?.kind === 'account') {
  await navigateTo(`/user/${target.value.name}`, {
    replace: true,
    redirectCode: 301,
  })
}

// Empty unless the path is owner/name, so neither scan runs for it.
const repo = computed<string>(() =>
  target.value?.kind === 'repository' ? target.value.path : '',
)

const repoInput = ref(repo.value || path.value)

const {
  data: report,
  error: reportError,
  refresh: refreshReport,
} = await useRepoReport(repo)

// One address per repo: pasted GitHub links, trailing slashes and renamed
// repos (facebook/react → react/react) settle on the canonical owner/name.
const canonicalRepo = report.value?.repo ?? repo.value

if (canonicalRepo && canonicalRepo !== path.value) {
  await navigateTo(`/scan/${canonicalRepo}`, {
    replace: true,
    redirectCode: 301,
  })
}

const isInvalid = computed<boolean>(
  () => !repo.value || reportError.value?.status === 400,
)

// A 404 only means the repo isn't in the daily scan; the live scan still runs.
const isUntracked = computed<boolean>(() => reportError.value?.status === 404)
const hasReportError = computed<boolean>(
  () => !!reportError.value && !isUntracked.value && !isInvalid.value,
)

const scanNotFound = ref(false)
const isNotFound = computed<boolean>(
  () => scanNotFound.value && isUntracked.value,
)

const repoName = computed<string>(() => report.value?.repo ?? repo.value)
const trackedSince = computed<string | undefined>(() =>
  report.value ? getTrackedSince(report.value.days) : undefined,
)

const title = computed<string>(
  () => `${repoName.value || 'Not a repository'} | AgentScan`,
)

useHead({ title })

const { classification, summary, score } = useRepoReportSummary(report)

if (report.value) {
  useHead({
    meta: [
      { property: 'og:title', content: title.value },
      {
        property: 'og:description',
        content:
          summary.value?.text ??
          `No pull requests scored in the past ${REPO_REPORT_PERIOD_DAYS} days.`,
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
</script>

<template>
  <CommonSearchForm v-model="repoInput" class="mb-8" />

  <div v-if="isInvalid || isNotFound" class="text-center py-12 text-ui-muted">
    <template v-if="isInvalid">
      <h1 class="text-lg font-semibold text-ui-text">Not a repository</h1>
      <p class="mt-2 text-sm">
        Use the owner/name format, for example vuejs/core.
      </p>
    </template>
    <template v-else>
      <h1 class="text-lg font-semibold text-ui-text">Repository not found</h1>
      <p class="mt-2 text-sm">
        <span class="text-ui-text font-medium">{{ repo }}</span> doesn't exist
        on GitHub or isn't public. Check the name and try again.
      </p>
    </template>
  </div>

  <div v-else class="flex flex-col gap-12">
    <div class="flex flex-col gap-6">
      <p v-if="report">
        <NuxtLink
          to="/activity/repositories"
          class="inline-flex items-center gap-1 text-sm text-ui-muted hover:text-ui-text"
        >
          <span class="i-lucide:arrow-left" aria-hidden="true" />
          Tracked repositories
        </NuxtLink>
      </p>

      <RepoPageHeader :repo="repoName" :tracked-since />

      <p
        v-if="hasReportError"
        class="flex flex-wrap items-baseline gap-x-3 text-sm text-ui-muted"
      >
        Could not load the 30-day report.
        <button
          type="button"
          class="underline hover:text-ui-text"
          @click="refreshReport()"
        >
          Try again
        </button>
      </p>

      <RepoReportSummary v-if="report" :report />
    </div>

    <RepoLiveScan :repo="repoName" @not-found="scanNotFound = true" />

    <RepoReportDailyScore v-if="report" :days="report.days" />

    <CommonDisclaimer class="mx-auto max-w-lg text-center" />
  </div>
</template>
