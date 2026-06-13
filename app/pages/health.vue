<script setup lang="ts">
import type { IdentityClassification } from "@unveil/identity";
import {
  formatTrend,
  getHealthStats,
  getTrendArrow,
  getTrendColor,
} from "~~/shared/health-stats";

const { data: ecosystemHealth } = await useEcosystemHealth();
const data = computed(() => ecosystemHealth.value?.results);
const categoryProgression = computed(() => {
  return ecosystemHealth.value?.categoryProgression;
});

const { formattedNextScanTime } = useNextScanTime();

definePageMeta({
  layout: "full",
});

useHead({
  title: "GitHub Ecosystem Health | AgentScan",
  meta: [
    {
      name: "description",
      content:
        "A snapshot of community contribution patterns across the ecosystem.",
    },
    { property: "og:title", content: "GitHub Ecosystem Health | AgentScan" },
    { property: "og:image", content: "/health.png" },
    {
      property: "og:description",
      content:
        "A snapshot of community contribution patterns across the ecosystem.",
    },
    { property: "og:type", content: "website" },
  ],
});

type ClassificationStats = Record<
  IdentityClassification,
  { count: number; percentage: string }
>;

type ClassificationConfig = {
  key: IdentityClassification;
  label: string;
  bgColor: string;
};

const classificationConfigs: ClassificationConfig[] = [
  { key: "organic", label: "Organic", bgColor: "bg-green-500" },
  { key: "mixed", label: "Mixed", bgColor: "bg-gh-amber" },
  { key: "automation", label: "Automation", bgColor: "bg-gh-danger-hover" },
];

const latestDayStats = computed<ClassificationStats | null>(() => {
  console.log(getHealthStats(data.value));
  return getHealthStats(data.value);
});

const automatedPrClosure = computed(() => ({
  label: "Automation PR closure rate",
  bgColor: "bg-gray-500",
  percentage: (() => {
    const value = getClosedPrPercentageTotal(data.value, [0, 50]);
    return value === null ? "N/A" : `${value}%`;
  })(),
}));

const MIN_DAY_DATA_COLLECTION = 4;
const hasEnoughData = computed(() => {
  if (!data.value?.length) {
    return false;
  }

  const dates = data.value.map((dataItem) => dataItem.created_at);
  const uniqueDates = new Set(dates);

  return uniqueDates.size >= MIN_DAY_DATA_COLLECTION;
});
</script>

<template>
  <section v-if="hasEnoughData" class="flex flex-col gap-6 h-full pb-8 md:pb-0">
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
              Each day, we analyze 10 PRs from a curated
              <NuxtLink
                class="underline hover:text-gh-text"
                external
                target="_blank"
                to="https://github.com/MatteoGabriele/agentscan/tree/main/shared/daily-scan.ts"
                >list of repositories</NuxtLink
              >
            </p>
          </div>
        </header>

        <ul
          class="text-center flex flex-col md:flex-row gap-2 items-center md:text-left w-full justify-evenly mt-6 px-4 md:py-4 md:border-y md:border-y-gh-border/60"
        >
          <li
            v-for="config in classificationConfigs"
            :key="config.key"
            class="flex gap-2 items-center flex-1 justify-center"
          >
            <span :class="`size-2 ${config.bgColor} block rounded-full`"></span>

            <p class="text-sm">
              {{ config.label }}

              <span class="text-gh-muted ml-1">
                {{ latestDayStats?.[config.key]?.percentage }}%
              </span>

              <span
                :class="[
                  getTrendColor({
                    value: categoryProgression?.[config.key].trend,
                    reversed: config.key !== 'organic',
                  }),
                ]"
              >
                <span
                  :class="[
                    getTrendArrow(categoryProgression?.[config.key].trend),
                  ]"
                  class="shrink-0"
                  style="vertical-align: middle"
                />
                {{ formatTrend(categoryProgression?.[config.key].trend) }}
              </span>
            </p>
          </li>
        </ul>

        <ul
          class="text-center flex flex-col md:flex-row md:gap-6 items-center md:text-left w-full justify-center mt-2 mb-12 md:my-4"
        >
          <li class="flex gap-2 items-center">
            <span
              :class="`size-2 ${automatedPrClosure.bgColor} block rounded-full`"
            ></span>
            <p class="text-sm text-gh-text">
              {{ automatedPrClosure.label }}
              <span class="text-gh-muted">
                {{ automatedPrClosure.percentage }}
              </span>
            </p>
          </li>
        </ul>
      </div>

      <div class="max-h-[300px] sm:max-h-[500px] w-full h-full">
        <ChartGlobalEventsEvolution />
      </div>

      <div
        class="absolute -bottom-4 text-center md:text-right w-full md:bottom-2 right-0 md:right-6"
      >
        <p class="text-xs text-gh-text/40 mt-3">
          {{ formattedNextScanTime }}
        </p>
      </div>
    </div>
  </section>
  <section
    v-else
    class="flex items-center justify-center flex-col gap-6 h-full"
  >
    <header class="text-center flex items-center flex-col">
      <AnimationTea class="mb-4" />
      <h1 class="text-xl font-semibold">Data collection in progress</h1>
      <div class="text-gh-muted mt-2 flex flex-col text-pretty max-w-lg">
        <p>
          We're currently collecting fresh data to provide you with more
          accurate ecosystem health insights.
        </p>
        <p class="mt-2">Please check back soon.</p>
      </div>
    </header>
  </section>
</template>
