<script setup lang="ts">
import {
  DEFAULT_HISTORY_MONTHS,
  WINDOW_MAX_HOURS,
} from '~~/shared/utils/health-history-window'

definePageMeta({
  layout: 'full',
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

const rangeOptions: ChartRangeOption[] = [
  {
    value: 'daily',
    label: 'Daily',
    caption: `Daily totals from the last ${DEFAULT_HISTORY_MONTHS} months`,
  },
  {
    value: 'hourly',
    label: 'Hourly',
    caption: `Last ${WINDOW_MAX_HOURS} hours, updated every hour`,
  },
]

const range = ref<ChartRange>('daily')

const activeRangeCaption = computed(() => {
  return rangeOptions.find((option) => option.value === range.value)?.caption
})
</script>

<template>
  <section class="flex flex-col gap-6 h-full pb-8 md:pb-0">
    <div
      class="h-full flex flex-col items-center justify-center w-full relative"
    >
      <div class="mx-auto max-w-2xl w-full">
        <header class="text-center mt-16 md:mt-24 px-4">
          <h1 class="text-2xl font-semibold">GitHub Ecosystem Health</h1>
          <div class="text-gh-muted mt-1 flex flex-col text-pretty">
            <p>
              A snapshot of community contribution patterns across the ecosystem
            </p>
            <p class="text-xs text-gh-muted/70 mt-1 text-pretty">
              Every hour, we scan new pull requests from a curated
              <NuxtLink
                class="underline hover:text-gh-text"
                external
                target="_blank"
                to="https://github.com/MatteoGabriele/agentscan/tree/main/shared/daily-scan.ts"
              >
                list of repositories </NuxtLink
              >.
            </p>
            <p class="text-xs text-gh-muted/70 text-pretty">
              Daily totals combine every hourly scan from that day
            </p>
          </div>
        </header>

        <div class="mt-4 px-4 md:py-4 md:border-y md:border-y-gh-border/40">
          <HealthTrendItemList />
        </div>

        <div class="mt-6 mb-3 flex flex-col items-center gap-1.5 px-4">
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
        </div>
      </div>

      <div
        class="w-full min-h-0 shrink overflow-hidden basis-[300px] max-h-[300px] sm:basis-[500px] sm:max-h-[500px]"
      >
        <ChartHourlyEventsEvolutionNext v-if="range === 'hourly'" />
        <ChartGlobalEventsEvolution v-else />
      </div>
    </div>
  </section>
</template>
