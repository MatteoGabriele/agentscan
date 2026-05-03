<script setup lang="ts">
import {
  VueUiScatter,
  type VueUiScatterDatasetItem,
  type VueUiScatterConfig,
} from "vue-data-ui/vue-ui-scatter";
import { shiftColorHue } from "vue-data-ui/utils";
import "vue-data-ui/style.css";

const { data, status, error } = useScan();
const colorMode = useColorMode();

definePageMeta({
  layout: false,
});

function getScoreColor(score: number): string {
  const baseColor = colorMode.value === "dark" ? "#FF6B6B" : "#A00000";
  const shift = colorMode.value === "dark" ? score / 300 : score / 400;
  return shiftColorHue(baseColor, shift);
}

function convertToScatterCluster(dataset: Scan[]): VueUiScatterDatasetItem[] {
  return [
    {
      name: "",
      values: dataset.map((item) => ({
        x: item.score,
        y: item.events_count,
        name: "",
      })),
    },
  ];
}

function convertToScatterDataset(rawData: Scan[]): VueUiScatterDatasetItem[] {
  return rawData.map((plot, i) => {
    const label = `repos: ${plot.user_public_repos_count}`;
    return {
      name: label,
      color: getScoreColor(plot.score),
      values: [{ x: plot.score, y: plot.events_count, name: label }],
    };
  });
}

const dataset = computed<VueUiScatterDatasetItem[]>(() => {
  return [
    ...convertToScatterCluster(data.value ?? []),
    ...convertToScatterDataset(data.value ?? []),
  ];
});

const averageScore = computed(() => {
  return (
    dataset.value
      .flatMap((d) => d.values.map((v) => v.x))
      .reduce((a, b) => a + b, 0) / dataset.value.length
  );
});

const daySpan = computed(() => {
  if (!data.value || data.value.length === 0) return 1;
  const dates = data.value.map((d) => new Date(d.created_at).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
});

const config = computed<VueUiScatterConfig>(() => {
  return {
    theme: "dark",
    userOptions: { show: false },
    style: {
      legend: { show: false },
      tooltip: { show: false },
      title: {
        text: `Average score per day: ${Math.round(averageScore.value / daySpan.value)}`,
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
