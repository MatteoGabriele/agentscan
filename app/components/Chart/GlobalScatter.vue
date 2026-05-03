<script setup lang="ts">
import { computed } from "vue";
import {
  VueUiScatter,
  type VueUiScatterDatasetItem,
  type VueUiScatterConfig,
} from "vue-data-ui/vue-ui-scatter";

import "vue-data-ui/style.css";
import { useCssVariables } from "~/composables/useColors";

const props = defineProps<{
  data: Scan[] | undefined;
}>();

const rootEl = shallowRef<HTMLElement | null>(null);

onMounted(async () => {
  rootEl.value = document.documentElement;
});

const { colors } = useCssVariables(
  [
    "--bg",
    "--card",
    "--border",
    "--border-light",
    "--text",
    "--text-muted",
    "--blue",
    "--green",
    "--green-hover",
    "--text-green",
    "--green-bg",
    "--danger",
    "--danger-hover",
    "--danger-bg",
    "--red",
    "--red-hover",
    "--red-bg",
  ],
  {
    element: rootEl,
  },
);

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
      dataset: props.data ?? [],
      min: 0,
      max: 50,
      color: colors.value.redHover!,
      name: "automated (0 - 50)",
    }),
    ...convertToScatterCluster({
      dataset: props.data ?? [],
      min: 51,
      max: 70,
      color: colors.value.dangerHover!,
      name: "mixed (50 - 70)",
    }),
    ...convertToScatterCluster({
      dataset: props.data ?? [],
      min: 71,
      max: 101,
      color: colors.value.greenHover!,
      name: "organic (70 - 100)",
    }),
  ];
});

const averageScore = computed(() => {
  return (
    dataset.value
      .flatMap((d) => d.values.map((v) => v.x))
      .reduce((a, b) => a + b, 0) / (props.data ?? []).length
  );
});

const config = computed<VueUiScatterConfig>(() => {
  return {
    userOptions: {
      show: false,
      useCursorPointer: true,
    },
    style: {
      backgroundColor: "transparent",
      legend: {
        show: true,
        backgroundColor: "transparent",
        color: colors.value.textMuted,
      },
      tooltip: { show: false },
      title: {
        text: `Average score: ${Math.round(averageScore.value)}`,
        bold: false,
        color: colors.value.text,
      },
      layout: {
        height: 300,
        plots: {
          radius: 3,
          opacity: 1,
          opacityNotSelected: 1,
          stroke: colors.value.bg,
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
          stroke: colors.value.borderLight,
        },
        dataLabels: {
          reverseAxisLabels: true,
          xAxis: {
            offsetY: -20,
            showValue: false,
            name: "score",
            color: colors.value.textMuted,
            scales: {
              show: true,
              steps: 2,
              labels: {
                color: colors.value.textMuted,
              },
            },
          },
          yAxis: {
            name: "event count",
            offsetX: 28,
            showValue: false,
            color: colors.value.textMuted,
            scales: {
              show: true,
              steps: 2,
              labels: {
                color: colors.value.textMuted,
              },
            },
          },
        },
      },
    },
  };
});
</script>

<template>
  <ClientOnly>
    <VueUiScatter :dataset :config />
  </ClientOnly>
</template>
