<script setup lang="ts">
import type { VueUiStacklineDatasetItem } from "vue-data-ui/vue-ui-stackline";

// NOTE: The data treatment is identical to the one on /health
// Eventually, we can just move the heatmaps there ?
// If not, we'll make a composable to centralize data computation
const { data } = useEcosystemHealth();

definePageMeta({
  layout: false,
});

const rootEl = shallowRef<HTMLElement | null>(null);
const colors = useColors(rootEl);

function createChartDataset(source?: EcosystemHealthItem[]): {
  categories: string[];
  dataset: VueUiStacklineDatasetItem[];
} {
  if (!source?.length) {
    return {
      categories: [],
      dataset: [
        {
          name: "Organic",
          series: [],
          color: colors.value.greenLine,
        },
        {
          name: "Mixed",
          series: [],
          color: colors.value.amber,
        },
        {
          name: "Automation",
          series: [],
          color: colors.value.dangerHover,
        },
      ],
    };
  }

  const categories = [...new Set(source.map((item) => item.created_at))].sort();

  const sumsByDate: Record<
    string,
    {
      automation: number;
      mixed: number;
      organic: number;
    }
  > = {};

  categories.forEach((date) => {
    sumsByDate[date] = {
      automation: 0,
      mixed: 0,
      organic: 0,
    };
  });

  source.forEach((item) => {
    const dateSums = sumsByDate[item.created_at];

    if (!dateSums) return;

    if (item.score <= 50) {
      dateSums.automation += 1;
    } else if (item.score <= 70) {
      dateSums.mixed += 1;
    } else {
      dateSums.organic += 1;
    }
  });

  return {
    categories,
    dataset: [
      {
        name: "Organic",
        series: categories.map((date) => sumsByDate[date]?.organic ?? 0),
        color: colors.value.greenLine,
      },
      {
        name: "Mixed",
        series: categories.map((date) => sumsByDate[date]?.mixed ?? 0),
        color: colors.value.amber,
      },
      {
        name: "Automation",
        series: categories.map((date) => sumsByDate[date]?.automation ?? 0),
        color: colors.value.dangerHover,
      },
    ],
  };
}

const stacklineData = computed(() => createChartDataset(data.value));

const dataset = computed(() => stacklineData.value.dataset);

const timestamps = computed(() => {
  if (!data.value?.length) return [];

  return [...new Set(data.value.map((item) => item.created_at))].sort();
});
</script>

<template>
  <div class="my-6 w-screen flex items-center justify-center text-3xl">
    <ChartGlobalEventsHeatmap :data="dataset" :timestamps />
  </div>
  <div class="my-6 w-screen flex items-center justify-center text-3xl">
    <ChartFeaturedPackageHealthRanking class="max-w-150" />
  </div>
</template>
