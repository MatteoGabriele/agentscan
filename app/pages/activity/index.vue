<script setup lang="ts">
import {
  DEFAULT_HISTORY_MONTHS,
  WINDOW_MAX_HOURS,
} from '~~/shared/utils/activity-history-window'
import { useUrlSearchParams } from '@vueuse/core'
import type { ActivityUnit } from '~~/shared/types/activity'
import { getActivityWeekSnapshot } from '~~/shared/utils/activity-week'
import { getClassificationDetails } from '@unveil/identity/report'

definePageMeta({
  layout: false,
})

const DESCRIPTION =
  'A snapshot of community contribution patterns across the ecosystem.'

// Shares the cached request with the trend list and the daily chart.
const { data: activity } = await useActivity()
const week = activity.value ? getActivityWeekSnapshot(activity.value) : null

useHead(
  {
    title: 'Ecosystem Activity | AgentScan',
    meta: [
      { name: 'description', content: DESCRIPTION },
      { property: 'og:title', content: 'Ecosystem Activity | AgentScan' },
      {
        property: 'og:description',
        content: week
          ? `${week.total.toLocaleString('en')} pull requests scored in the past week. ${DESCRIPTION}`
          : DESCRIPTION,
      },
      { property: 'og:type', content: 'website' },
    ],
  },
  // The full layout is rendered inside this page, so its generic tags would
  // otherwise be registered last and win.
  { tagPriority: 'high' },
)

if (week) {
  defineOgImage('ActivityWeek', { week })
}

type ChartRange = 'daily' | 'hourly'
type ChartRangeOption = {
  value: ChartRange
  label: string
}

const { data: librariesData } = await useLibraries()

const isMobile = useIsMobile()

const rangeOptions: ChartRangeOption[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'hourly', label: 'Hourly' },
]

const urlParams = useUrlSearchParams<{
  view: ChartRange | undefined
  unit: ActivityUnit | undefined
}>('history', {
  initialValue: {
    view: 'daily',
    unit: 'percentage',
  },
})

const unit = computed<ActivityUnit>(() => {
  return urlParams.unit === 'quantity' ? 'quantity' : 'percentage'
})

// Rendered outside the Toggle so it sits below both toggles
const rangeCaption = computed(() =>
  urlParams.view === 'hourly'
    ? // Mobile shows 13 datapoints; the caption rounds to 12.
      `Last ${isMobile.value ? 12 : WINDOW_MAX_HOURS} hours, updated every hour`
    : `Daily totals from the last ${isMobile.value ? 2 : DEFAULT_HISTORY_MONTHS} ${isMobile.value ? 'weeks' : 'months'}`,
)
</script>

<template>
  <NuxtLayout name="full">
    <template #hero>
      <section class="flex flex-col gap-6 h-full pb-8 md:pb-0">
        <div
          class="h-full flex flex-col items-center justify-center w-full relative"
        >
          <div class="mx-auto max-w-2xl w-full">
            <header class="text-center mt-16 md:mt-24 px-4">
              <h1 class="text-2xl font-semibold">Ecosystem Activity</h1>
              <div class="text-ui-muted mt-1 flex flex-col text-pretty">
                <p>
                  A snapshot of community contribution patterns across the
                  ecosystem
                </p>
              </div>
              <p class="text-ui-muted text-sm">
                <NuxtLink to="#learn-more" class="underline"
                  >Learn more</NuxtLink
                >
                about how it works.
              </p>
            </header>

            <div class="mt-4 px-4 md:py-4 md:border-y md:border-y-ui-border/40">
              <ActivityTrendItemList :view="urlParams.view" :unit />
            </div>

            <div class="mt-6 mb-3 flex flex-col items-center gap-1.5 px-4">
              <ClientOnly>
                <div class="flex flex-wrap items-center justify-center gap-2">
                  <Toggle
                    v-model="urlParams.view"
                    :options="rangeOptions"
                    label="Chart time range"
                  />
                  <ActivityUnitToggle v-model="urlParams.unit" />
                </div>
                <p class="text-xs text-ui-muted">{{ rangeCaption }}</p>

                <template #fallback>
                  <div class="mb-1 flex gap-2">
                    <Skeleton
                      width="w-[122px]"
                      height="h-[26px]"
                      rounded="full"
                    />
                    <Skeleton
                      width="w-[170px]"
                      height="h-[26px]"
                      rounded="full"
                    />
                  </div>
                  <Skeleton
                    width="w-[192px]"
                    height="h-[10px]"
                    rounded="full"
                  />
                </template>
              </ClientOnly>
            </div>
          </div>

          <div
            class="w-full min-h-0 shrink overflow-hidden basis-[300px] max-h-[300px] sm:basis-[500px] sm:max-h-[500px]"
          >
            <LazyChartHourlyEventsEvolution
              v-if="urlParams.view === 'hourly'"
              :unit
            />
            <LazyChartGlobalEventsEvolution v-else :unit />
          </div>
        </div>
      </section>
    </template>

    <section id="learn-more" class="mx-auto max-w-2xl px-4 py-16 md:py-24">
      <h2 class="text-xl font-semibold">
        What is the Ecosystem Activity chart?
      </h2>
      <div class="mt-4 flex flex-col gap-2 text-ui-text/80 text-pretty">
        <p>
          This page tracks the state of the GitHub community by analyzing public
          activity. The question we're trying to answer: how many pull requests
          come from people, and how many come from automated accounts?
        </p>
        <p>
          This isn't an anti-AI project, though we do have our opinions. We're
          simply tired of watching open source maintainers drown in spam.
        </p>

        <h3 class="mt-6 font-semibold text-ui-text">How a scan works</h3>
        <p>
          Every hour, we check each of our
          <NuxtLink to="#repositories" class="underline">repositories</NuxtLink>
          and collect the 10 most recent pull requests opened during the hour
          before, or however many there are.
        </p>
        <p>
          We skip accounts that match known bots, like Copilot, Dependabot,
          Renovate, GitHub Actions, and other common automation tools. For every
          PR author, we review up to 300 of their recent public GitHub events,
          using the same
          <NuxtLink
            external
            href="https://github.com/unveil-project/identity"
            class="underline"
            >identity</NuxtLink
          >
          library that powers every AgentScan profile scan.
        </p>

        <h3 class="mt-6 font-semibold text-ui-text">What the groups mean</h3>
        <dl class="flex flex-col gap-2">
          <div
            v-for="{ name, category } in CLASSIFICATIONS_WITH_NAME_AND_CATEGORY"
            :key="category"
            class="flex gap-2"
          >
            <dt class="inline font-medium text-ui-text">{{ name }}:</dt>
            <dd class="inline">
              {{ getClassificationDetails(category).description }}
            </dd>
          </div>
        </dl>
        <p>
          A group describes the account that opened the pull request, not the
          project.
        </p>

        <h3 class="mt-6 font-semibold text-ui-text">From hours to days</h3>
        <p>
          The hourly view shows the last {{ WINDOW_MAX_HOURS }} hours, one point
          per scan. Once a day is complete, we combine its hours into one daily
          result, which is what feeds the daily view and its
          {{ DEFAULT_HISTORY_MONTHS }} months of history.
        </p>

        <h3 class="mt-6 font-semibold text-ui-text">How to read it</h3>
        <p>
          These are indicators, not definitive verdicts. The chart describes a
          sample of pull requests from a fixed list of repositories, so read it
          as a trend over time rather than as a measurement of GitHub as a
          whole.
        </p>

        <h3 id="repositories" class="mt-6 font-semibold text-ui-text">
          Which repositories
        </h3>
        <p>
          For now, we track {{ librariesData?.total ?? 0 }} repositories. Some
          we picked by hand because we care about them; others were chosen at
          random from the GitHub trending repositories page. They go from
          TypeScript, JavaScript, Go, Python, and Rust to toolchains,
          frameworks, testing libraries, learning websites, and even AI-related
          projects.
        </p>

        <p>
          <NuxtLink to="/activity/repositories" class="underline"
            >Browse all tracked repositories</NuxtLink
          >, grouped by category, and open any of them for its own report.
        </p>
      </div>
    </section>
  </NuxtLayout>
</template>
