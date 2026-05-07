<script setup lang="ts">
import {
  VueUiGauge,
  type VueUiGaugeDataset,
  type VueUiGaugeConfig,
} from "vue-data-ui/vue-ui-gauge";

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
    "--event-fork",
    "--event-branch",
    "--event-pr",
    "--event-organic-pr",
    "--event-organic-branch",
    "--event-organic-fork",
    "--event-mixed-pr",
    "--event-mixed-branch",
    "--event-mixed-fork",
    "--event-automation-pr",
    "--event-automation-branch",
    "--event-automation-fork",
  ],
  {
    element: rootEl,
  },
);

const averageScoreOverall = computed(() => {
  const count = (props.data ?? []).length;
  if (count === 0) return 100;
  return (
    (props.data?.map((d) => d.score).reduce((a, b) => a + b, 0) ?? 0) /
    (props.data?.length ?? 1)
  );
});

const averageScoreCurrentDay = computed(() => {
  const data = props.data ?? [];
  if (data.length === 0) return 100;
  const latestTimestamp = Math.max(
    ...data.map((d) => new Date(d.created_at).getTime()),
  );
  const latestEntries = data.filter(
    (d) => new Date(d.created_at).getTime() === latestTimestamp,
  );
  if (latestEntries.length === 0) return 100;
  const total = latestEntries.reduce((sum, d) => sum + d.score, 0);
  return total / latestEntries.length;
});

const onlyCurrentDay = shallowRef(true);

const dataset = computed<VueUiGaugeDataset>(() => ({
  value: onlyCurrentDay.value
    ? averageScoreCurrentDay.value
    : averageScoreOverall.value,
  base: props.data?.length,
  series: [
    { from: 0, to: 50, color: colors.value.red, name: "automated" },
    { from: 50, to: 70, color: colors.value.dangerHover, name: "mixed" },
    { from: 70, to: 100, color: colors.value.green, name: "organic" },
  ],
}));

const config = computed<VueUiGaugeConfig>(() => ({
  userOptions: { show: false },
  style: {
    chart: {
      backgroundColor: "transparent",
      animation: { use: true },
      layout: {
        markers: {
          color: colors.value.textMuted,
          bold: false,
          offsetY: 6,
        },
        segmentNames: {
          show: true,
          curved: true,
          useSerieColor: true,
          fontSize: 24,
        },
        segmentSeparators: {
          show: true,
          stroke: colors.value.bg,
        },
        pointer: {
          type: "pointy",
          size: 1.1,
          stroke: colors.value.bg,
          circle: {
            stroke: colors.value.bg,
            color: colors.value.borderLight,
          },
        },
        track: {
          useGradient: false,
        },
      },
      legend: {
        show: true,
        bold: false,
        showPlusSymbol: false,
        roundingValue: 1, // if formatter is not used
        useRatingColor: true,
        color: colors.value.textMuted, // if useRatingColor is false
        // formatter: ({ value }) => {
        //   // apply any number formatter you want here if i18n is a thing
        //   return Math.round(value);
        // },
      },
    },
  },
}));
</script>

<template>
  <label>
    Score for current day
    <input type="checkbox" v-model="onlyCurrentDay" />
  </label>
  <ClientOnly>
    <VueUiGauge :dataset :config />
  </ClientOnly>
</template>
