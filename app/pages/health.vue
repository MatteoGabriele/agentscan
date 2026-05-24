<script setup lang="ts">
import type { IdentityClassification } from "@unveil/identity";
import { getClassificationDetails, identityConfig } from "@unveil/identity";

const { data } = useEcosystemHealth();

definePageMeta({
  layout: false,
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
</script>

<template>
  <div class="flex flex-col gap-6 justify-center h-svh">
    <header class="px-4 py-2">
      <NuxtLink to="/" aria-label="Homepage">
        <span class="i-carbon-scan relative top-1 text-gh-text text-xl" />
      </NuxtLink>
    </header>
    <section class="flex flex-col gap-6 h-full">
      <div
        class="h-full flex flex-col items-center justify-center w-full"
      >
        <div class="mx-auto max-w-3xl p-8">
          <header class="text-center">
            <h1 class="text-2xl font-semibold">Ecosystem health</h1>
            <div class="text-gh-muted mt-1 flex flex-col text-pretty">
              <p>
                A snapshot* of GitHub community activity patterns to measure the
                overall ecosystem health.
              </p>
              <p class="text-xs text-gh-muted/70">
                *Each day, we analyze 10 PRs from 10 unique authors across 10 randomly selected repositories from GitHub's trending projects of the day.
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
              <span
                :class="`size-2 ${config.bgColor} block rounded-full`"
              ></span>
              <p class="text-sm">
                {{ config.label }}
                <span class="text-gh-muted">
                  {{ latestDayStats?.[config.key].percentage }}% ({{
                    latestDayStats?.[config.key].count
                  }})
                </span>
              </p>
            </li>
          </ul>
        </div>
        <div class="max-h-[300px] sm:max-h-[500px] w-full h-full">
          <ChartGlobalStatusDashboard :data />
        </div>
      </div>
    </section>
  </div>
  <MainFooter />
</template>
