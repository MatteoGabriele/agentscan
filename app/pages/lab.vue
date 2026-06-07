<script setup lang="ts">
import type { VueUiStacklineDatasetItem } from "vue-data-ui/vue-ui-stackline";

definePageMeta({
  layout: "default",
});

const rootEl = shallowRef<HTMLElement | null>(null);
const colors = useColors(rootEl);
const { dates, countsByDate } = useEcosystemHealthCountsByDate();

function createChartDataset(): {
  categories: string[];
  dataset: VueUiStacklineDatasetItem[];
} {
  return {
    categories: dates.value,
    dataset: [
      {
        name: "Organic",
        series: dates.value.map(
          (date) => countsByDate.value[date]?.organic ?? 0,
        ),
        color: colors.value.greenLine,
      },
      {
        name: "Mixed",
        series: dates.value.map((date) => countsByDate.value[date]?.mixed ?? 0),
        color: colors.value.amber,
      },
      {
        name: "Automation",
        series: dates.value.map(
          (date) => countsByDate.value[date]?.automation ?? 0,
        ),
        color: colors.value.dangerHover,
      },
    ],
  };
}

const stacklineData = computed(() => createChartDataset());

const dataset = computed(() => stacklineData.value.dataset);
</script>

<template>
  <section class="flex flex-col gap-6 h-full">
    <div class="h-full flex flex-col items-center justify-center w-full">
      <header class="text-center">
        <h1 class="text-2xl font-semibold">The Lab</h1>
        <p class="text-gh-muted mt-1 mb-8">Sh*t can be broken here.</p>
        <div
          class="mt-4 p-4 bg-gh-card border-1 border-solid border-gh-border rounded-2 text-center"
        >
          <div
            aria-hidden="true"
            class="flex gap-2 items-center justify-center text-xl text-gh-text/60 mb-2"
          >
            <span class="i-lucide:flask-conical"></span>
            <span class="i-lucide:skull"></span>
            <span class="i-lucide:triangle-alert"></span>
          </div>
          <p class="text-sm text-gh-text leading-relaxed">
            This page is a sandbox where we test new ideas and features. Things
            here may break, data might be inaccurate, or features could
            disappear entirely. Take everything on this page with a grain of
            salt and treat it as early-stage exploration, not production-ready
            tools.
          </p>
        </div>
      </header>
    </div>

    <div
      class="flex flex-col gap-20 items-center justify-center max-w-4xl mx-auto pb-12 w-full px-4"
    >
      <div>
        <ChartHealthResponseSparklines />
      </div>
      <div class="w-full">
        <ChartFeaturedPackageHealthRanking />
      </div>
      <div class="w-full">
        <ChartGlobalEventsHeatmap :data="dataset" :timestamps="dates" />
      </div>
      <div class="w-full">
        <h2 class="text-xl font-semibold mb-4">Scan Results by User ID</h2>
        <AnalysisScanListTable />
      </div>

      <div class="w-full">
        <h2 class="text-xl font-semibold mb-4">Scan Results by User ID</h2>
        <AnalysisScanListTable />
      </div>
    </div>
  </section>
</template>
