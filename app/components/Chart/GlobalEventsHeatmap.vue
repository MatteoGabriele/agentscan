<script setup lang="ts">
import {
  VueUiHeatmap,
  type VueUiHeatmapDatasetItem,
  type VueUiHeatmapConfig,
  type VueUiHeatmapDatapoint,
} from "vue-data-ui/vue-ui-heatmap";
import type { VueUiStacklineDatasetItem } from "vue-data-ui/vue-ui-stackline";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { mergeConfigs } from "vue-data-ui/utils";
import("vue-data-ui/style.css");

dayjs.extend(isoWeek);

import("vue-data-ui/style.css");

const props = defineProps<{
  data: VueUiStacklineDatasetItem[];
  timestamps: string[];
}>();

const rootEl = shallowRef<HTMLElement | null>(null);

onMounted(() => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const dayIndexes = daysOfWeek.reduce(
  (accumulator, dayName, dayIndex) => {
    accumulator[dayName] = dayIndex;
    return accumulator;
  },
  {} as Record<string, number>,
);

const heatmapSeries = computed(() => [
  {
    name: "Organic",
    color: colors.value.greenLine,
  },
  {
    name: "Mixed",
    color: colors.value.amber,
  },
  {
    name: "Automation",
    color: colors.value.dangerHover,
  },
]);

const weekKeys = computed(() =>
  [
    ...new Set(
      props.timestamps.map((timestamp) =>
        dayjs(timestamp).startOf("isoWeek").format("YYYY-MM-DD"),
      ),
    ),
  ].sort(),
);

const weekLabels = computed(() =>
  weekKeys.value.map((weekKey) => {
    const start = dayjs(weekKey);
    const end = start.endOf("isoWeek");

    return `${start.format("MMM D")} - ${end.format("MMM D")}`;
  }),
);

function createHeatmapDataset(
  dataset: VueUiStacklineDatasetItem[],
  timestamps: string[],
  seriesName: string,
): VueUiHeatmapDatasetItem[] {
  const selectedSeries = dataset.find(
    (seriesItem) => seriesItem.name === seriesName,
  );

  if (!selectedSeries) {
    return daysOfWeek.map((dayName) => ({
      name: dayName,
      values: [],
    }));
  }

  const valuesByWeekAndDay = new Map<string, number[]>();

  timestamps.forEach((timestamp, timestampIndex) => {
    const date = dayjs(timestamp);
    const weekKey = date.startOf("isoWeek").format("YYYY-MM-DD");
    const dayIndex = date.isoWeekday() - 1;

    const weekValues = valuesByWeekAndDay.get(weekKey) ?? [0, 0, 0, 0, 0, 0, 0];

    weekValues[dayIndex] =
      (weekValues[dayIndex] ?? 0) +
      (selectedSeries.series[timestampIndex] ?? 0);

    valuesByWeekAndDay.set(weekKey, weekValues);
  });

  return daysOfWeek.map((dayName, dayIndex) => ({
    name: dayName,
    values: weekKeys.value.map(
      (weekKey) => valuesByWeekAndDay.get(weekKey)?.[dayIndex] ?? 0,
    ),
  }));
}

const numberOfWeeks = computed(() => weekKeys.value.length);

const baseConfig = computed<VueUiHeatmapConfig>(() => ({
  userOptions: { show: false },
  style: {
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    layout: {
      width: numberOfWeeks.value * 43,
      cells: {
        spacing: 0,
        colors: {
          cold: colors.value.bg,
        },
        selected: {
          border: 2,
          color: colors.value.text,
        },
        value: { show: false },
      },
      dataLabels: {
        xAxis: {
          show: true,
          color: colors.value.textMuted,
          values: weekLabels.value,
        },
        yAxis: {
          color: colors.value.textMuted,
        },
      },
    },
    legend: { show: false },
    tooltip: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 70,
    },
  },
}));

function createHeatmapConfig(hotColor: string): VueUiHeatmapConfig {
  return mergeConfigs({
    defaultConfig: baseConfig.value,
    userConfig: {
      style: {
        layout: {
          cells: {
            colors: {
              hot: hotColor,
            },
          },
        },
      },
    },
  });
}

const heatmaps = computed(() =>
  heatmapSeries.value.map((seriesItem) => ({
    name: seriesItem.name,
    color: seriesItem.color,
    dataset: createHeatmapDataset(
      props.data,
      props.timestamps,
      seriesItem.name,
    ),
    config: createHeatmapConfig(seriesItem.color!),
  })),
);

function getDateFromHeatmapCell(datapoint: VueUiHeatmapDatapoint): string {
  const xName = datapoint?.xAxisName ?? "";
  const yName = datapoint?.yAxisName ?? "";
  const weekIndex = weekLabels.value.indexOf(xName);
  const weekKey = weekKeys.value[weekIndex];
  if (!weekKey) return "";
  const targetDate = dayjs(weekKey).add(dayIndexes[yName] ?? 0, "day");

  return targetDate.format("DD MMM (ddd)");
}
</script>

<template>
  <div :style="{ width: numberOfWeeks * 60 + 'px' }">
    <ClientOnly>
      <VueUiHeatmap
        v-for="heatmap in heatmaps"
        :key="heatmap.name"
        :dataset="heatmap.dataset"
        :config="heatmap.config"
      >
        <template #tooltip="{ datapoint }">
          <div class="mb-1" :style="{ color: colors.textMuted }">
            {{ getDateFromHeatmapCell(datapoint) }}
          </div>

          <div class="flex flex-row gap-2 items-center">
            <div class="h-2 w-2">
              <svg viewBox="0 0 2 2" class="w-full h-full">
                <circle cx="1" cy="1" r="1" :fill="heatmap.color" />
              </svg>
            </div>

            <span>{{ heatmap.name }}</span>
            <span :style="{ color: colors.textMuted }">{{
              datapoint.value
            }}</span>
          </div>
        </template>
      </VueUiHeatmap>
    </ClientOnly>
  </div>
</template>

<style scoped>
:deep(rect) {
  shape-rendering: crispEdges !important;
}
</style>
