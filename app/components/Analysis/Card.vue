<script setup lang="ts">
import type { AsyncDataRequestStatus } from '#app'
import type { ClassificationLabel } from '@unveil/identity'
import type { Report } from '@unveil/identity/report'
import { fromGitHub, type GitHubUser } from '@unveil/identity/providers/github'
import type { AnalyzeReturn } from '@unveil/vk'
import { buildReportIssueUrl } from '~~/shared/utils/report-issue'
import type { RepoEvent } from '~/utils/repo-activity'

const props = defineProps<{
  user: GitHubUser
  analysis?: AnalyzeReturn | null
  status: AsyncDataRequestStatus
  error?: unknown
  retry: () => unknown
}>()

const username = computed<string | undefined | null>(() => props.user.login)

const { data: accountReports, status: accountReportsStatus } = useLazyFetch(
  () => `/api/account-reports/${username.value}`,
  {
    key: () => `account-reports:${username.value}`,
    query: () => ({ id: props.user.id }),
  },
)

const isPending = computed<boolean>(() => {
  return props.status === 'pending' || accountReportsStatus.value === 'pending'
})

const { data: cachedVerifiedAutomations } = useNuxtData<VerifiedAutomation[]>(
  VERIFIED_AUTOMATION_CACHE_KEY,
)

const cachedVerifiedAutomation = computed<VerifiedAutomation | undefined>(
  () => {
    return cachedVerifiedAutomations.value?.find((account) => {
      return account.id === props.user.id
    })
  },
)

const verifiedAutomation = computed<VerifiedAutomation | undefined>(() => {
  if (accountReportsStatus.value === 'pending') {
    return cachedVerifiedAutomation.value
  }

  return accountReports.value?.verifiedAutomation ?? undefined
})

const matchedTally = computed(() => {
  return accountReports.value?.automationTally ?? undefined
})

const activityReport = computed<IntegrationItem | undefined>(() => {
  return accountReports.value?.integration ?? undefined
})

const { data: openReport, pending: isLoadingReports } =
  usePendingReport(username)

const hasActivityReport = computed<boolean>(() => !!activityReport.value)
const hasCommunityFlag = computed<boolean>(() => !!verifiedAutomation.value)

const classification = computed<ClassificationLabel | undefined>(() => {
  return isPending.value ? undefined : props.analysis?.report.classification
})

const repoEvents = computed<RepoEvent[]>(() => {
  if (!classification.value) {
    return []
  }
  const events = props.analysis?.events ?? []
  return fromGitHub({ user: props.user, events }).events
})

const rawEventsUrl = computed<string>(() => {
  return `https://api.github.com/users/${username.value}/events?per_page=100`
})

type ResultView = 'report' | 'analysis'

// The community report is the stronger evidence, so it opens first.
const activeView = ref<ResultView>('report')
watch(username, () => {
  activeView.value = 'report'
})

type ResultViewTabs = {
  value: ResultView
  label: string
  icon?: string
}

const resultViewTabs: ResultViewTabs[] = [
  { value: 'report', label: 'Community report', icon: 'i-lucide:circle-alert' },
  { value: 'analysis', label: 'Analysis' },
]

const viewTabsId = useId()

const isShowingReport = computed<boolean>(() => {
  return hasCommunityFlag.value && activeView.value === 'report'
})

const hasSignals = computed<boolean>(() => {
  return (
    (props.analysis?.report.flags.length ?? 0) > 0 || hasActivityReport.value
  )
})

const { scoreStyle } = useScoreStyle(
  classification,
  computed(() => ({
    hasCommunityFlag: isShowingReport.value,
    hasActivityReport: hasActivityReport.value,
  })),
)

const flagAccountUrl = computed<string>(() => {
  return buildReportIssueUrl({
    username: username.value || '',
    userId: props.user.id,
    flags: props.analysis?.report.flags ?? [],
    sourceUrl: `https://agentscan.tools/user/${username.value}`,
  })
})

const identifyAnalysis = computed<Report | undefined>(() => {
  return props.analysis?.report
})

const score = computed<number | undefined>(() => {
  return props.analysis?.report.score
})

const isBountyHunter = computed<boolean>(() => {
  return !!props.analysis?.report.isBountyHunter
})

const { nearestClassification } = useNearestClassification(score)

const confidence = computed<number | undefined>(() => {
  return props.analysis?.report.confidence
})

const { coverageLevel } = useDataCoverage(confidence)

const warnings = computed<string[]>(() => {
  const list: string[] = []

  if (
    coverageLevel.value === 'low' &&
    classification.value !== 'insufficient-data'
  ) {
    list.push('There is little activity to analyze, so this result may change.')
  }

  if (nearestClassification.value) {
    list.push(
      `This result is close to the "${CLASSIFICATION_NAMES[nearestClassification.value]}" group.`,
    )
  }

  if (isBountyHunter.value) {
    list.push('Possible bounty activity.')
  }

  if (matchedTally.value) {
    const count = matchedTally.value.counter
    list.push(
      `Previously classified as automation on ${count} pull request${count === 1 ? '' : 's'} in repositories we scan daily.`,
    )
  }

  return list
})

useSeoAnalysis(identifyAnalysis, {
  hasCommunityFlag,
  hasActivityReport,
})
</script>

<template>
  <div
    class="flex flex-col gap-6 bg-ui-card py-4 @md:py-6 rounded-2 border-2 border-solid transition-colors duration-300 motion-reduce:transition-none"
    :class="scoreStyle.border"
  >
    <div class="px-6">
      <UserDetails :user />
    </div>

    <AnalysisViewTabs
      v-if="hasCommunityFlag"
      v-model="activeView"
      :tabs="resultViewTabs"
      :id-base="viewTabsId"
    />
    <div
      v-else
      class="fade-divider mx-6 h-px opacity-35"
      :class="scoreStyle.background"
      aria-hidden="true"
    />

    <div class="px-6">
      <template v-if="verifiedAutomation">
        <ReportDetails
          v-show="activeView === 'report'"
          :id="`${viewTabsId}-panel-report`"
          role="tabpanel"
          :aria-labelledby="`${viewTabsId}-tab-report`"
          tabindex="0"
          :report="verifiedAutomation"
        />

        <div
          v-show="activeView === 'analysis'"
          :id="`${viewTabsId}-panel-analysis`"
          role="tabpanel"
          :aria-labelledby="`${viewTabsId}-tab-analysis`"
          :aria-busy="isPending"
          tabindex="0"
        >
          <LazyAnalysisCardSkeleton v-if="isPending" :footer="false" />
          <LazyErrorCardGeneric
            v-else-if="error"
            :error
            :retry="() => retry()"
          />
          <AnalysisSummary
            v-else-if="analysis"
            compact
            :classification
            :events="repoEvents"
            :events-count="analysis.eventsCount"
            :raw-events-url
            :warnings
            :has-activity-report
          />
        </div>
      </template>

      <LazyAnalysisCardSkeleton v-else-if="isPending" />
      <LazyErrorCardGeneric v-else-if="error" :error :retry="() => retry()" />
      <template v-else-if="analysis">
        <AnalysisSummary
          :classification
          :events="repoEvents"
          :events-count="analysis.eventsCount"
          :raw-events-url
          :warnings
          :has-activity-report
        />

        <section class="mt-4 pt-4 border-t border-ui-border-subtle">
          <template v-if="isLoadingReports">
            <p class="text-ui-muted text-sm">
              Know something about this account? Help the community.
            </p>
            <span
              class="h-2.5 bg-ui-border rounded w-20 inline-block animate-pulse"
              aria-hidden="true"
            />
          </template>
          <template v-else-if="openReport">
            <p class="text-ui-muted text-sm">
              This account already has an open report under review. Add what you
              know there.
            </p>
            <NuxtLink
              :to="openReport.url"
              target="_blank"
              external
              class="underline inline text-xs"
            >
              View open report #{{ openReport.number }}
            </NuxtLink>
          </template>
          <template v-else>
            <p class="text-ui-muted text-sm">
              Know something about this account? Help the community.
            </p>
            <NuxtLink
              :to="flagAccountUrl"
              target="_blank"
              external
              class="underline inline text-xs"
            >
              Add report
            </NuxtLink>
          </template>
        </section>
      </template>
    </div>
  </div>

  <div v-if="isPending || (analysis && hasSignals)" class="@lg:mx-6">
    <AnalysisFlagsSkeleton v-if="isPending" />
    <LazyAnalysisFlags
      v-else-if="analysis"
      :flags="analysis.report.flags"
      :activity-report="activityReport"
      hydrate-on-interaction
    />
  </div>

  <template
    v-if="classification && classification !== 'insufficient-data' && analysis"
  >
    <LazyChartAccountEventsTimeline
      :classification="classification"
      :events="analysis.events"
      hydrate-on-visible
    />
  </template>

  <CommonDisclaimer class="mt-8 mx-auto max-w-md text-center" />
</template>
