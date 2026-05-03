<script setup lang="ts">
import { computed } from "vue";
import {
  VueUiScatter,
  type VueUiScatterDatasetItem,
  type VueUiScatterConfig,
} from "vue-data-ui/vue-ui-scatter";

import "vue-data-ui/style.css";

const { data, status, error } = useScan();

definePageMeta({
  layout: false,
});

type ScatterClusterParams = {
  dataset: Scan[];
  min: number;
  max: number;
  color: string;
  name: string;
};

function convertToScatterCluster(
  args: ScatterClusterParams,
): VueUiScatterDatasetItem[] {
  const { dataset, min, max, color, name } = args;
  return [
    {
      name,
      color,
      values: dataset
        .map((item) => ({
          x: item.score,
          y: item.events_count,
          name: "",
        }))
        .filter((item) => item.x >= min && item.x <= max),
    },
  ];
}

const dataset = computed<VueUiScatterDatasetItem[]>(() => {
  return [
    ...convertToScatterCluster({
      dataset: data.value ?? [],
      min: 0,
      max: 50,
      color: "red",
      name: "automated",
    }),
    ...convertToScatterCluster({
      dataset: data.value ?? [],
      min: 51,
      max: 70,
      color: "orange",
      name: "mixed",
    }),
    ...convertToScatterCluster({
      dataset: data.value ?? [],
      min: 71,
      max: 101,
      color: "green",
      name: "organic",
    }),
  ];
});

const averageScore = computed(() => {
  return (
    dataset.value
      .flatMap((d) => d.values.map((v) => v.x))
      .reduce((a, b) => a + b, 0) / (data.value ?? []).length
  );
});

const config = computed<VueUiScatterConfig>(() => {
  return {
    userOptions: { show: false },
    style: {
      backgroundColor: "transparent",
      legend: { show: true },
      tooltip: { show: false },
      title: {
        text: `Average score: ${Math.round(averageScore.value)}`,
      },
      layout: {
        plots: {
          radius: 3,
          opacity: 1,
          opacityNotSelected: 1,
          giftWrap: {
            show: true,
          },
          significance: {
            show: false,
          },
        },
        correlation: { show: false },
        padding: {
          left: 20,
          bottom: 20,
        },
        axis: {
          xMin: 0,
          xMax: 100,
        },
        dataLabels: {
          reverseAxisLabels: true,
          xAxis: {
            showValue: false,
            name: "score",
            scales: {
              show: true,
            },
          },
          yAxis: {
            name: "event count",
            showValue: false,
            scales: {
              show: true,
            },
          },
        },
      },
    },
  };
});
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto">
    <div
      v-if="status === 'pending'"
      class="text-center text-gray-500 dark:text-gray-400"
    >
      loading data...
    </div>
    <div v-else-if="data" class="space-y-1">
      <ClientOnly>
        <VueUiScatter :dataset :config />
      </ClientOnly>
    </div>
    <div v-else-if="error" class="text-red-600 dark:text-red-400 text-sm">
      {{ error.message }}
    </div>
  </div>
</template>
