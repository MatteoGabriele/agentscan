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

const { data: accountReports, status: accountReportsStatus } = useFetch(
  () => `/api/account-reports/${username.value}`,
  {
    key: computed(() => `account-reports:${username.value}`),
    query: computed(() => ({ id: props.user.id })),
    lazy: true,
  },
)

// Held until community reports settle too, so a reported account never
// flashes its regular classification before switching.
const isPending = computed<boolean>(() => {
  return props.status === 'pending' || accountReportsStatus.value === 'pending'
})

const verifiedAutomation = computed(() => {
  return accountReports.value?.verifiedAutomation ?? undefined
})

const matchedTally = computed(() => {
  return accountReports.value?.automationTally ?? undefined
})

const activityReport = computed<IntegrationItem | undefined>(() => {
  return accountReports.value?.integration ?? undefined
})

const approvedBy = computed<string[]>(() => {
  return verifiedAutomation.value?.approvedBy ?? []
})

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
const hasEventBreakdown = computed<boolean>(() => {
  return groupEventsByRepo(repoEvents.value).length > 0
})

const hasSignals = computed<boolean>(() => {
  return (
    (props.analysis?.report.flags.length ?? 0) > 0 || hasActivityReport.value
  )
})

const { classificationDetails } = useClassificationDetails(classification)
const { scoreStyle } = useScoreStyle(
  classification,
  computed(() => ({
    hasCommunityFlag: hasCommunityFlag.value,
    hasActivityReport: hasActivityReport.value,
  })),
)

const { classificationIcon } = useClassificationIcons(classification)

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
    class="flex flex-col gap-6 bg-ui-card py-4 @md:py-6 rounded-2 border-2 border-solid"
    :class="scoreStyle.border"
  >
    <div class="px-6">
      <UserDetails :user />
    </div>

    <div
      class="fade-divider mx-6 h-px opacity-35"
      :class="scoreStyle.background"
      aria-hidden="true"
    />

    <div class="px-6">
      <LazyAnalysisCardSkeleton v-if="isPending" />
      <LazyErrorCardGeneric v-else-if="error" :error :retry="() => retry()" />
      <template v-else-if="analysis">
        <section v-if="verifiedAutomation">
          <header class="mb-2 flex gap-2 items-center text-ui-automation">
            <span class="i-lucide:circle-alert text-base" aria-hidden="true" />
            <h3 class="text-xl font-mono">Community reported</h3>
          </header>

          <p class="mt-1 text-ui-text">
            {{ verifiedAutomation.reason }}
          </p>

          <footer
            class="mt-4 pt-4 border-t border-ui-border-subtle/40 flex flex-wrap items-start justify-between gap-x-4 gap-y-2"
          >
            <div class="flex flex-col gap-2">
              <ReportMeta :report="verifiedAutomation" />

              <ReportApprovals
                v-if="approvedBy.length"
                :approved-by="approvedBy"
              />
            </div>

            <NuxtLink
              :to="verifiedAutomation.issueUrl"
              target="_blank"
              external
              class="text-ui-muted underline inline text-xs hover:text-ui-text"
            >
              View or dispute the report
            </NuxtLink>
          </footer>
        </section>
        <template v-else>
          <header class="flex items-center justify-between mb-2">
            <div class="w-full">
              <div class="mb-2 flex flex-col">
                <div
                  v-if="warnings.length"
                  class="flex items-start gap-2 text-sm text-ui-muted mb-2"
                >
                  <span
                    class="i-lucide:info text-xs shrink-0"
                    aria-hidden="true"
                  />
                  <ul class="flex flex-col gap-1">
                    <li
                      v-for="(warning, i) in warnings"
                      :key="i"
                      class="text-pretty line-height-none"
                    >
                      {{ warning }}
                    </li>
                  </ul>
                </div>

                <div class="flex flex-wrap gap-2 items-center">
                  <div class="flex gap-2 items-center" :class="scoreStyle.text">
                    <span
                      :class="classificationIcon"
                      class="text-base"
                      aria-hidden="true"
                    />
                    <h3 class="text-xl font-mono">
                      {{ classificationDetails.label }}
                    </h3>
                  </div>
                </div>
              </div>
              <p class="mt-1 text-ui-text">
                {{ classificationDetails.description }}
              </p>
            </div>
          </header>

          <AnalysisRepoActivityDisclosure
            v-if="hasEventBreakdown"
            :events="repoEvents"
            :raw-events-url
            class="mt-4"
          />

          <p class="mt-3 text-sm text-ui-muted">
            <template v-if="analysis.eventsCount > 0">
              Analyzed from the last {{ analysis.eventsCount }} public GitHub
              events
            </template>
            <template v-else>No recent events from this account</template>
          </p>
        </template>

        <section
          v-if="!verifiedAutomation"
          class="mt-4 pt-4 border-t border-ui-border-subtle"
        >
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

    <LazyChartAccountEventsBreakdown
      :classification="classification"
      :events="analysis.events"
      hydrate-on-interaction
    />
  </template>

  <CommonDisclaimer class="mt-8 mx-auto max-w-md text-center" />
</template>
