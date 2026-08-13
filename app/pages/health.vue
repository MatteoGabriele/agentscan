<script setup lang="ts">
import {
  DEFAULT_HISTORY_MONTHS,
  WINDOW_MAX_HOURS,
} from '~~/shared/utils/health-history-window'
import { libraries } from '~~/shared/daily-scan'
import { useLocalStorage } from '@vueuse/core'

definePageMeta({
  layout: false,
})

useHead({
  title: 'GitHub Ecosystem Health | AgentScan',
  meta: [
    {
      name: 'description',
      content:
        'A snapshot of community contribution patterns across the ecosystem.',
    },
    { property: 'og:title', content: 'GitHub Ecosystem Health | AgentScan' },
    { property: 'og:image', content: '/health.png' },
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

const range = useLocalStorage<ChartRange>('daily-range', 'daily', {
  initOnMounted: true,
})

const activeRangeCaption = computed(() => {
  return rangeOptions.value.find((option) => option.value === range.value)
    ?.caption
})
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
              <h1 class="text-2xl font-semibold">GitHub Ecosystem Health</h1>
              <div class="text-gh-muted mt-1 flex flex-col text-pretty">
                <p>
                  A snapshot of community contribution patterns across the
                  ecosystem
                </p>
              </div>
              <p class="text-gh-muted text-sm">
                <NuxtLink href="#learn-more" class="underline"
                  >Learn more</NuxtLink
                >
                about how it works.
              </p>
            </header>

            <div class="mt-4 px-4 md:py-4 md:border-y md:border-y-gh-border/40">
              <HealthTrendItemList />
            </div>

            <div class="mt-6 mb-3 flex flex-col items-center gap-1.5 px-4">
              <ClientOnly>
                <div
                  role="group"
                  aria-label="Chart time range"
                  class="inline-flex gap-0.5 rounded-full border border-gh-border-light/40 p-0.5"
                >
                  <button
                    v-for="option in rangeOptions"
                    :key="option.value"
                    type="button"
                    :aria-pressed="range === option.value"
                    class="rounded-full px-3 py-0.5 text-xs font-medium transition-colors"
                    :class="
                      range === option.value
                        ? 'bg-gh-border/30 text-gh-text'
                        : 'text-gh-muted hover:bg-gh-border/15 hover:text-gh-text'
                    "
                    @click="range = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>

                <p class="text-xs text-gh-muted/70">
                  {{ activeRangeCaption }}
                </p>

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
            <LazyChartHourlyEventsEvolution v-if="range === 'hourly'" />
            <LazyChartGlobalEventsEvolution v-else />
          </div>
        </div>
      </section>
    </template>

    <section id="learn-more" class="mx-auto max-w-2xl px-4 py-16 md:py-24">
      <h2 class="text-xl font-semibold">What is the Ecosystem Health chart?</h2>
      <div class="mt-4 flex flex-col gap-2 text-gh-text/80 text-pretty">
        <p>
          This page gives you a look into the current state of the GitHub
          community by analyzing public activity. We want to understand how many
          accounts are coding on their own, how many are genuinely supporting
          others, and how many are just flooding the space.
        </p>
        <p>
          We don't dislike AI. We're just growing tired of seeing open source
          projects overwhelmed by constant spam.
        </p>

        <h3 class="mt-6 font-semibold text-gh-text">How a scan works</h3>
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

        <h3 class="mt-6 font-semibold text-gh-text">From hours to days</h3>
        <p>
          The hourly view shows the last {{ WINDOW_MAX_HOURS }} hours, one point
          per scan. Once a day is complete, we compound its hours into a single
          daily scan result, which is what feeds the daily view and its
          {{ DEFAULT_HISTORY_MONTHS }} months of history.
        </p>

        <h3 class="mt-6 font-semibold text-gh-text">How to read it</h3>
        <p>
          These are indicators, not definitive verdicts. The chart describes a
          sample of pull requests from a fixed list of repositories, so read it
          as a trend over time rather than as a measurement of GitHub as a
          whole.
        </p>

        <h3 id="repositories" class="mt-6 font-semibold text-gh-text">
          Which repositories
        </h3>
        <p>
          For now, we track {{ libraries.length }} repositories. Some we picked
          by hand because we care about them; others were chosen at random from
          the GitHub trending repositories page. They go from TypeScript,
          JavaScript, Go, Python, and Rust to toolchains, frameworks, testing
          libraries, learning websites, and even AI-related projects.
        </p>
        <ul>
          <li v-for="name in libraries" :key="name">
            <NuxtLink
              class="underline"
              external
              :href="`https://github.com/${name}`"
              >{{ name }}</NuxtLink
            >
          </li>
        </ul>
      </div>
    </section>
  </NuxtLayout>
</template>
