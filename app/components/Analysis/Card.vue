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

// Insufficient-data accounts already list every analyzed event.
const repoEvents = computed<RepoEvent[]>(() => {
  if (!classification.value || classification.value === 'insufficient-data') {
    return []
  }
  const events = props.analysis?.events ?? []
  return fromGitHub({ user: props.user, events }).events
})

// Opened from the "events" toggle in the card.
const isEventBreakdownOpen = ref(false)

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
    list.push('Limited activity to analyze. Treat this result as provisional.')
  }

  if (nearestClassification.value) {
    list.push(`Activity close to ${nearestClassification.value} signals.`)
  }

  if (isBountyHunter.value) {
    list.push('Possible bounty activity.')
  }

  if (matchedTally.value) {
    const count = matchedTally.value.counter
    list.push(
      `Opened ${count} PR${count === 1 ? '' : 's'} in repositories we scan daily, while scoring as automation.`,
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

            <div class="flex items-center gap-3 text-xs">
              <button
                class="inline-flex items-center gap-0.5 text-ui-muted hover:text-ui-text underline decoration-dotted underline-offset-4 hover:decoration-solid"
                :aria-expanded="isEventBreakdownOpen"
                aria-controls="event-breakdown"
                @click="isEventBreakdownOpen = !isEventBreakdownOpen"
              >
                Event breakdown
                <span
                  class="i-lucide:chevron-down text-xs transition-transform"
                  :class="isEventBreakdownOpen && 'rotate-180'"
                  aria-hidden="true"
                />
              </button>
              <NuxtLink
                :to="verifiedAutomation.issueUrl"
                target="_blank"
                external
                class="text-ui-muted underline inline hover:text-ui-text"
              >
                View issue
              </NuxtLink>
            </div>
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
                  <span class="i-lucide:megaphone text-xs shrink-0"></span>
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
                    <span :class="classificationIcon" class="text-base" />
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

          <div
            class="text-sm text-ui-muted flex flex-wrap items-center gap-x-3 gap-y-2"
          >
            <p v-if="analysis.eventsCount > 0">
              Analyzed from the last {{ analysis.eventsCount }} public GitHub
              <!-- The raw API link moves into the breakdown panel. -->
              <button
                v-if="hasEventBreakdown"
                class="inline-flex items-center gap-0.5 text-ui-text underline decoration-dotted underline-offset-4 hover:decoration-solid"
                :aria-expanded="isEventBreakdownOpen"
                aria-controls="event-breakdown"
                @click="isEventBreakdownOpen = !isEventBreakdownOpen"
              >
                events
                <span
                  class="i-lucide:chevron-down text-xs transition-transform"
                  :class="isEventBreakdownOpen && 'rotate-180'"
                  aria-hidden="true"
                />
              </button>
              <NuxtLink
                v-else
                external
                target="_blank"
                class="underline"
                :to="rawEventsUrl"
              >
                events
              </NuxtLink>
            </p>
            <p v-else>
              No recent
              <NuxtLink
                external
                target="_blank"
                class="underline"
                :to="rawEventsUrl"
              >
                events</NuxtLink
              >
              from this account
            </p>

            <DetectionVersion class="hidden md:inline-flex" />
          </div>
        </template>

        <AnalysisRepoActivityPanel
          v-if="isEventBreakdownOpen && hasEventBreakdown"
          id="event-breakdown"
          :events="repoEvents"
          :raw-events-url
          class="mt-4 pt-3 border-t border-ui-border-subtle/40"
        />

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

  <div
    v-if="classification === 'insufficient-data' && analysis?.events.length"
    class="@lg:mx-6"
  >
    <LazyAnalysisActivityEvents :events="analysis.events" />
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

  <p
    class="mt-8 mx-auto max-w-md text-xs text-ui-muted/60 leading-relaxed text-pretty text-center"
  >
    Results are based on pattern analysis and should be interpreted as possible
    signals, not conclusions. Always verify findings with additional context.
  </p>
</template>
