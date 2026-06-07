<script setup lang="ts">
import type { IdentityClassification } from "@unveil/identity";
import { identityConfig } from "@unveil/identity";

const { data } = await useEcosystemHealth();
const { formattedNextScanTime } = useNextScanTime();

definePageMeta({
  layout: "full",
});

useHead({
  title: "Ecosystem health | AgentScan",
  meta: [
    {
      name: "description",
      content:
        "Track GitHub ecosystem health with daily analysis of 100 unique accounts from trending repositories. Monitor automation, mixed, and organic activity patterns over time to understand ecosystem trends.",
    },
    { property: "og:title", content: "Ecosystem health | AgentScan" },
    { property: "og:image", content: "/health.png" },
    {
      property: "og:description",
      content:
        "A snapshot of GitHub community activity patterns to measure the overall ecosystem health.",
    },
    { property: "og:type", content: "website" },
  ],
});

function classifyByScore(score: number): IdentityClassification {
  if (score >= identityConfig.THRESHOLD_HUMAN) {
    return "organic";
  } else if (score >= identityConfig.THRESHOLD_SUSPICIOUS) {
    return "mixed";
  } else {
    return "automation";
  }
}

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
  { key: "mixed", label: "Mixed", bgColor: "bg-amber-500" },
  { key: "automation", label: "Automation", bgColor: "bg-orange-500" },
];

function formatPercentage(value: number): string {
  return value.toFixed(1);
}

const latestDayStats = computed<ClassificationStats | null>(() => {
  if (!data.value?.length) return null;

  const totalCount = data.value.length;

  const counts: Record<IdentityClassification, number> = {
    organic: 0,
    mixed: 0,
    automation: 0,
  };

  data.value.forEach((item) => {
    const classification = classifyByScore(item.score);
    counts[classification]++;
  });

  return {
    organic: {
      count: counts.organic,
      percentage: formatPercentage((counts.organic / totalCount) * 100),
    },
    mixed: {
      count: counts.mixed,
      percentage: formatPercentage((counts.mixed / totalCount) * 100),
    },
    automation: {
      count: counts.automation,
      percentage: formatPercentage((counts.automation / totalCount) * 100),
    },
  };
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

  const uniqueDates = new Set(data.value.map((item) => item.created_at));

  return uniqueDates.size >= MIN_DAY_DATA_COLLECTION;
});

const { progression } = useEcosystemHealthCategoryProgression();

function formatTrend(value: number) {
  if (value > 0) return `+${(value * 100).toFixed(0)}%`;
  return `${(value * 100).toFixed(0)}%`;
}

function getTrendArrow(value: number) {
  if (value > 0) return "i-lucide:trending-up";
  if (value < 0) return "i-lucide:trending-down";
  return "i-lucide:trending-up-down";
}

function getTrendColor({
  value,
  reversed = false,
}: {
  value: number;
  reversed?: boolean;
}) {
  if (value > 0) return reversed ? "text-gh-red" : "text-gh-green";
  if (value < 0) return reversed ? "text-gh-green" : "text-gh-red";
  return "text-gh-muted";
}
</script>

<template>
  <section v-if="hasEnoughData" class="flex flex-col gap-6 h-full">
    <div class="h-full flex flex-col items-center justify-center w-full">
      <div class="mx-auto max-w-3xl p-8">
        <header class="text-center">
          <h1 class="text-2xl font-semibold">Ecosystem health</h1>
          <div class="text-gh-muted mt-1 flex flex-col text-pretty">
            <p>
              A snapshot* of GitHub community activity patterns to measure the
              overall ecosystem health.
            </p>
            <p class="text-xs text-gh-muted/70 mt-1">
              *Each day, we analyze 10 PRs from a curated list of repositories.
            </p>
            <p class="text-xs text-gh-muted/70 mt-3">
              {{ formattedNextScanTime }}
            </p>
          </div>
        </header>
        <ul
          class="text-center flex flex-col md:flex-row md:gap-6 items-center md:text-left w-full justify-center mt-12"
        >
          <li
            v-for="config in classificationConfigs"
            :key="config.key"
            class="flex gap-2 items-center"
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
                    value: progression[config.key].trend,
                    reversed: config.key !== 'organic',
                  }),
                ]"
              >
                <span
                  :class="[getTrendArrow(progression[config.key].trend)]"
                  class="shrink-0"
                  style="vertical-align: middle"
                />
                {{ formatTrend(progression[config.key].trend) }}
              </span>
            </p>
          </li>
        </ul>
        <ul
          class="text-center flex flex-col md:flex-row md:gap-6 items-center md:text-left w-full justify-center sm:mt-4"
        >
          <li class="flex gap-2 items-center">
            <span
              :class="`size-2 ${automatedPrClosure.bgColor} block rounded-full`"
            ></span>
            <p class="text-sm">
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
