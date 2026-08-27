<script setup lang="ts">
import type {
  GitHubUser,
  IdentityClassification,
  IdentifyResult,
} from '@unveil/identity'
import { buildReportIssueUrl } from '~~/shared/utils/report-issue'

const props = defineProps<{
  user: GitHubUser
}>()

const username = computed<string | undefined | null>(() => props.user.login)

const analysisKey = computed<string>(() => `analysis:${username.value}`)
const { data, status, error, refresh } = useFetch(
  () => `/api/identify-replicant/${username.value}`,
  {
    query: {
      show_events: true,
    },
    key: analysisKey,
    watch: [username],
    lazy: true,
  },
)

const { data: verifiedAutomations } = await useVerifiedAutomations()

const verifiedAutomation = computed(() => {
  return verifiedAutomations.value?.find((account) => {
    return (
      account.username.toLowerCase() === username.value?.toLowerCase() ||
      account.id === props.user.id
    )
  })
})

const { data: automationTally } = await useAutomationTally()
const matchedTally = computed(() => {
  return automationTally.value?.find((tally) => tally.id === props.user.id)
})

const { data: integrations } = await useIntegrations()
const activityReport = computed<IntegrationItem | undefined>(() => {
  return integrations.value?.find((item) => {
    return item.username.toLowerCase() === username.value?.toLowerCase()
  })
})

const approvedBy = computed<string[]>(() => {
  return verifiedAutomation.value?.approvedBy ?? []
})

const hasActivityReport = computed<boolean>(() => !!activityReport.value)
const hasCommunityFlag = computed<boolean>(() => !!verifiedAutomation.value)

const classification = computed<IdentityClassification | undefined>(() => {
  return data.value?.analysis.classification
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
    flags: data.value?.analysis.flags ?? [],
    sourceUrl: `https://agentscan.tools/user/${username.value}`,
  })
})

const identifyAnalysis = computed<IdentifyResult | undefined>(() => {
  return data.value?.analysis
})

const score = computed<number | undefined>(() => {
  return data.value?.analysis.score
})

const isBountyHunter = computed<boolean>(() => {
  return !!data.value?.analysis.isBountyHunter
})

const { nearestClassification } = useNearestClassification(score)

const confidence = computed<number | undefined>(() => {
  return data.value?.analysis.confidence
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
      <LazyAnalysisCardSkeleton v-if="status === 'pending'" />
      <LazyErrorCardGeneric v-else-if="error" :error :retry="() => refresh()" />
      <template v-else-if="data">
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
              View issue
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

                <div class="flex gap-2 items-center" :class="scoreStyle.text">
                  <span :class="classificationIcon" class="text-base" />
                  <h3 class="text-xl font-mono">
                    {{ classificationDetails.label }}
                  </h3>
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
            <p v-if="data.eventsCount > 0">
              Analyzed from the last {{ data.eventsCount }} public GitHub
              <NuxtLink
                external
                target="_blank"
                class="underline"
                :to="`https://api.github.com/users/${username}/events?per_page=100`"
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
                :to="`https://api.github.com/users/${username}/events?per_page=100`"
              >
                events</NuxtLink
              >
              from this account
            </p>
          </div>
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

  <div class="@lg:mx-6">
    <AnalysisFlagsSkeleton v-if="status === 'pending'" />
    <LazyAnalysisFlags
      v-else-if="data && (data.analysis.flags.length > 0 || hasActivityReport)"
      :flags="data.analysis.flags"
      :activity-report="activityReport"
      hydrate-on-interaction
    />
  </div>

  <template v-if="classification !== 'insufficient-data' && data">
    <LazyChartAccountEventsTimeline
      :classification="classification"
      :events="data.events"
      hydrate-on-visible
    />

    <LazyChartAccountEventsBreakdown
      :classification="classification"
      :events="data.events"
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
