<script setup lang="ts">
import {
  DEFAULT_HISTORY_MONTHS,
  WINDOW_MAX_HOURS,
} from '~~/shared/utils/activity-history-window'
import { useUrlSearchParams } from '@vueuse/core'

definePageMeta({
  layout: false,
})

useHead({
  title: 'Ecosystem Activity | AgentScan',
  meta: [
    {
      name: 'description',
      content:
        'A snapshot of community contribution patterns across the ecosystem.',
    },
    { property: 'og:title', content: 'Ecosystem Activity | AgentScan' },
    { property: 'og:image', content: '/activity.png' },
    {
      property: 'og:description',
      content:
        'A snapshot of community contribution patterns across the ecosystem.',
    },
    { property: 'og:type', content: 'website' },
  ],
})

type ChartRange = 'daily' | 'hourly'
type ChartRangeOption = {
  value: ChartRange
  label: string
  caption: string
}

const { data: librariesData } = await useLibraries()

const isMobile = useIsMobile()

const rangeOptions = computed<ChartRangeOption[]>(() => [
  {
    value: 'daily',
    label: 'Daily',
    caption: `Daily totals from the last ${isMobile.value ? 2 : DEFAULT_HISTORY_MONTHS} ${isMobile.value ? 'weeks' : 'months'}`,
  },
  {
    value: 'hourly',
    label: 'Hourly',
    // In mobile we actually show 13 datapoints, but saying 12 looks better on the UI
    caption: `Last ${isMobile.value ? 12 : WINDOW_MAX_HOURS} hours, updated every hour`,
  },
])

const urlParams = useUrlSearchParams<{ view: ChartRange | undefined }>(
  'history',
  {
    initialValue: {
      view: 'daily',
    },
  },
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
              <ActivityTrendItemList :view="urlParams.view" />
            </div>

            <div class="mt-6 mb-3 flex flex-col items-center gap-1.5 px-4">
              <ClientOnly>
                <Toggle v-model="urlParams.view" :options="rangeOptions" />

                <template #fallback>
                  <Skeleton
                    class="mb-1"
                    width="w-[122px]"
                    height="h-[26px]"
                    rounded="full"
                  />
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
            />
            <LazyChartGlobalEventsEvolution v-else />
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
          activity. The question we're trying to answer: how many accounts are
          genuinely contributing to open source, and how many are just flooding
          it with noise?
        </p>
        <p>
          This isn't an anti-AI project, though we do have our opinions. We're
          simply tired of watching open source maintainers drown in spam.
        </p>

        <h3 class="mt-6 font-semibold text-ui-text">How a scan works</h3>
        <p>
          Every hour, we check each of our
          <NuxtLink to="#repositories" class="underline">repositories</NuxtLink>
          and collect 10 of the most recent pull request opened during the hour
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

        <h3 class="mt-6 font-semibold text-ui-text">From hours to days</h3>
        <p>
          The hourly view shows the last {{ WINDOW_MAX_HOURS }} hours, one point
          per scan. Once a day is complete, we compound its hours into a single
          daily scan result, which is what feeds the daily view and its
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
          For now, we track {{ librariesData?.total ?? 0 }}. Some we picked by
          hand because we care about them; others were chosen at random from the
          GitHub trending repositories page. They go from TypeScript,
          JavaScript, Go, Python, and Rust to toolchains, frameworks, testing
          libraries, learning websites, and even AI-related projects.
        </p>
        <p>
          The list keeps growing. We would love to cover many more projects, but
          we have to stay within GitHub's API rate limits.
        </p>
        <ScannedRepositoryList />
      </div>
    </section>
  </NuxtLayout>
</template>
