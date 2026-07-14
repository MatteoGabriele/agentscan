<script setup lang="ts">
import type {
  GitHubUser,
  IdentityClassification,
  IdentifyResult,
} from '@unveil/identity'

const props = defineProps<{
  user: GitHubUser
}>()

const username = computed<string | undefined | null>(() => props.user.login)

const analysisKey = computed<string>(() => `analysis:${username.value}`)
const { data, status, error } = useFetch(
  () => `/api/identify-replicant/${username.value}`,
  {
    query: {
      created_at: props.user.created_at,
      repos_count: props.user.public_repos,
      pages: 3,
      show_events: true,
    },
    key: analysisKey,
    watch: [username],
    lazy: true,
  },
)

const { data: verifiedAutomations } = useVerifiedAutomations()

const verifiedAutomation = computed(() => {
  return verifiedAutomations.value?.find((account) => {
    return (
      account.username.toLowerCase() === username.value?.toLowerCase() ||
      account.id === props.user.id
    )
  })
})

const { data: integrations } = useIntegrations()
const activityReport = computed<IntegrationItem | undefined>(() => {
  return integrations.value?.find((item) => {
    return item.username.toLowerCase() === username.value?.toLowerCase()
  })
})

const hasActivityReport = computed<boolean>(() => !!activityReport.value)
const hasCommunityFlag = computed<boolean>(() => !!verifiedAutomation.value)

const classification = computed<IdentityClassification | undefined>(() => {
  return data.value?.analysis.classification
})

const { classificationDetails } = useClassificationDetails(classification)
const { scoreStyle } = useScoreStyle(
  classification,
  computed(() => ({ hasCommunityFlag: hasCommunityFlag.value })),
)

const classificationIcon = computed<string>(() => {
  if (classification.value === 'organic') {
    return 'i-lucide:heart-handshake'
  }

  if (classification.value === 'mixed') {
    return 'i-lucide:blend'
  }

  return 'i-lucide:shield-alert'
})

const flagAccountUrl = computed<string>(() => {
  const baseUrl = 'https://github.com/MatteoGabriele/agentscan/issues/new'
  const params = new URLSearchParams({
    template: 'report-automated-account.yml',
    title: `[AUTOMATION] ${username.value}`,
    username: username.value || '',
    'user-id': props.user.id.toString(),
  })
  return `${baseUrl}?${params.toString()}`
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

const warnings = computed<string[]>(() => {
  const list: string[] = []

  if (nearestClassification.value) {
    list.push(`Activity close to ${nearestClassification.value} signals.`)
  }

  if (isBountyHunter.value) {
    list.push('Possible bounty activity.')
  }

  return list
})

useSeoAnalysis(identifyAnalysis, {
  hasCommunityFlag,
  hasActivityReport,
})
</script>

<template>
  <LazyAnalysisCardSkeleton v-if="status === 'pending'" />
  <LazyErrorCardGeneric v-else-if="error" :error />
  <template v-else-if="data">
    <div
      class="flex gap-6 bg-gh-card p-6 rounded-2 border-2 border-solid flex-col @lg:flex-row"
      :class="scoreStyle.border"
    >
      <div class="w-full">
        <header class="flex items-center justify-between mb-2">
          <div class="w-full">
            <div class="mb-2 flex flex-col">
              <div
                v-if="warnings.length"
                class="flex items-start gap-2 text-sm text-gh-muted mb-2"
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
            <p class="mt-1 text-gh-text">
              {{ classificationDetails.description }}
            </p>
          </div>
        </header>

        <div class="text-sm text-gh-muted">
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

        <section
          v-if="verifiedAutomation"
          class="mt-4 pt-4 border-t border-gh-border-light/40"
        >
          <p
            class="flex gap-2 items-center mb-2 text-gh-muted font-mono text-base"
          >
            Community reported
          </p>
          <p class="text-gh-text text-sm mb-2">
            {{ verifiedAutomation.reason }}
          </p>
          <footer class="flex items-baseline justify-between">
            <ReportMeta :report="verifiedAutomation" />

            <NuxtLink
              :to="verifiedAutomation.issueUrl"
              target="_blank"
              external
              class="text-gh-muted underline inline text-xs"
            >
              View issue
            </NuxtLink>
          </footer>
        </section>

        <section v-else class="mt-4 pt-4 border-t border-gh-border-light">
          <p class="text-gh-muted text-sm">
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
      </div>
    </div>

    <LazyAnalysisFlags
      v-if="data.analysis.flags.length > 0 || hasActivityReport"
      :flags="data.analysis.flags"
      :activity-report="activityReport"
      hydrate-on-interaction
    />

    <LazyChartAccountEventsTimeline
      :classification="data.analysis.classification"
      :events="data.events"
      hydrate-on-visible
    />

    <LazyChartAccountEventsBreakdown
      :classification="data.analysis.classification"
      :events="data.events"
      hydrate-on-interaction
    />
    <p
      class="mt-8 mx-auto max-w-md text-xs text-gh-muted/60 leading-relaxed text-pretty text-center"
    >
      Results are based on pattern analysis and should be interpreted as
      possible signals, not conclusions. Always verify findings with additional
      context.
    </p>
  </template>
</template>
