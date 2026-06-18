<script setup lang="ts">
import { useElementSize } from "@vueuse/core";
import {
  VueUiXy,
  type VueUiXyDatasetItem,
  type VueUiXyConfig,
} from "vue-data-ui/vue-ui-xy";
import { useChartTooltipPosition } from "~/composables/useChartTooltipPosition";
import { useColors } from "~/composables/useColors";
import { getClosedPrPercentageEvolutionTotal } from "~~/shared/utils/charts";
import { identityConfig } from "@unveil/identity";

import("vue-data-ui/style.css");

const { data: ecosystemHealth } = await useEcosystemHealth();
const data = computed(() => ecosystemHealth.value?.results ?? []);
const dates = computed(() => ecosystemHealth.value?.dates);
const countsByDate = computed(() => ecosystemHealth.value?.countsByDate);

const chartContainer = useTemplateRef<HTMLElement>("chartContainer");
const { width, height } = useElementSize(chartContainer);

const rootEl = shallowRef<HTMLElement | null>(null);
const chartRef = useTemplateRef("chartRef");

onMounted(async () => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);

const automatedClosureRateData = computed(() => ({
  ...getClosedPrPercentageEvolutionTotal(data.value, [
    0,
    identityConfig.THRESHOLD_SUSPICIOUS,
  ]),
  scaleMin: 0,
  scaleMax: 100,
  color: "grey",
  dashed: true,
}));

function composeRawDataset(): VueUiXyDatasetItem[] {
  return [
    {
      name: "Organic",
      series:
        dates.value?.map(
          (date) => countsByDate.value?.[date]?.organic.count ?? 0,
        ) ?? [],
      trends:
        dates.value?.map(
          (date) => countsByDate.value?.[date]?.organic.trend ?? 0,
        ) ?? [],
      color: colors.value.greenLine,
      type: "line",
      smooth: true,
      useArea: true,
    },
    {
      name: "Mixed",
      series:
        dates.value?.map(
          (date) => countsByDate.value?.[date]?.mixed.count ?? 0,
        ) ?? [],
      trends:
        dates.value?.map(
          (date) => countsByDate.value?.[date]?.mixed.trend ?? 0,
        ) ?? [],
      color: colors.value.amber,
      type: "line",
      smooth: true,
      useArea: true,
    },
    {
      name: "Automation",
      series:
        dates.value?.map(
          (date) => countsByDate.value?.[date]?.automation.count ?? 0,
        ) ?? [],
      trends:
        dates.value?.map(
          (date) => countsByDate.value?.[date]?.automation.trend ?? 0,
        ) ?? [],
      color: colors.value.dangerHover,
      type: "line",
      smooth: true,
      useArea: true,
    },
  ];
}

const rawDataset = computed(() => composeRawDataset());

const max = computed(() => {
  const values = rawDataset.value.flatMap((d) =>
    (d.series as Array<number | null>).map((point) => point ?? 0),
  );
  return values.length > 0 ? Math.max(...values) : 0;
});

const dataset = computed<VueUiXyDatasetItem[]>(() => [
  ...rawDataset.value.map((d) => ({
    ...d,
    scaleMax: max.value,
  })),
  automatedClosureRateData.value,
]);

const tooltipPosition = useChartTooltipPosition(chartRef);

const progressionLabelOffsetX = 6; // compensate hard-coded internal in VueUiXy

const viewBoxPadding = computed(() => {
  const maxSeries = dates.value?.length ?? 0;
  if (maxSeries <= 1) return { left: 0, right: 0 };
  const halfVueUiXyDatapointStep = width.value / (2 * (maxSeries - 1));
  return {
    left: -halfVueUiXyDatapointStep,
    right: -halfVueUiXyDatapointStep - progressionLabelOffsetX,
  };
});

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  downsample: {
    threshold: 5000,
  },
  line: {
    radius: 0,
    useGradient: false,
    dot: {
      useSerieColor: true,
      fill: colors.value.bg,
      strokeWidth: 2,
    },
  },
  chart: {
    userOptions: { show: false },
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    width: width.value,
    height: height.value,
    padding: {
      left: viewBoxPadding.value.left,
      right: viewBoxPadding.value.right,
    },
    grid: {
      position: "middle",
      stroke: "transparent",
      labels: {
        show: false,
        yAxis: {
          crosshairSize: 0,
          useIndividualScale: true,
        },
        xAxisLabels: {
          show: false,
          values: dates.value,
          datetimeFormatter: {
            enable: true,
            useUTC: false,
            locale: "en",
            options: {
              year: "dd MMM",
              month: "dd MMM",
              day: "MMM dd • HH:mm",
              minute: "dd MMM",
              second: "dd MMM",
            },
          },
        },
      },
    },
    highlighter: {
      opacity: 1,
      color: colors.value.text,
      useLine: true,
    },
    legend: { show: false },
    tooltip: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 30,
      position: tooltipPosition.value,
      offsetX: 24,
      offsetY: -56,
    },
    zoom: { show: false },
  },
}));

function getTrend({ series, item, index }: any) {
  const trend = series?.[item.slotAbsoluteIndex]?.trends?.[index];
  return {
    formattedValue: formatTrend(trend),
    color: getTrendColor({ value: trend, reversed: item.name !== "Organic" }),
    arrow: getTrendArrow(trend),
  };
}
</script>

<template>
  <div class="relative h-full w-full flex flex-col">
    <div class="flex-1 h-full no-chart-transition" ref="chartContainer">
      <ClientOnly>
        <VueUiXy ref="chartRef" :dataset :config>
          <template #area-gradient="{ series, id }">
            <linearGradient :id x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" :stop-color="series.color" stop-opacity="0.3" />
              <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
            </linearGradient>
          </template>

          <template #tooltip="{ datapoint, timeLabel, series }">
            <div class="flex flex-col">
              <div :style="{ color: colors.textMuted }" class="mb-1">
                {{ timeLabel.text }}
              </div>
              <div
                class="flex flex-row gap-2 place-items-center"
                v-for="dp in datapoint"
                :key="`${dp.name}-${dp.absoluteIndex}`"
              >
                <div class="h-2 w-2">
                  <svg viewBox="0 0 2 2" class="w-full h-full">
                    <circle cx="1" cy="1" r="1" :fill="dp.color" />
                  </svg>
                </div>
                <span :style="{ color: colors.text }">{{ dp.name }}</span>
                <span :style="{ color: colors.textMuted }">{{
                  dp.value +
                  (dp.slotAbsoluteIndex === dataset.length - 1 ? "%" : "")
                }}</span>

                <!-- No trend is possible on the first datapoint -->
                <template v-if="timeLabel.absoluteIndex > 0">
                  <span
                    :class="[
                      getTrend({
                        series,
                        item: dp,
                        index: timeLabel.absoluteIndex,
                      }).color,
                    ]"
                    v-if="dp.slotAbsoluteIndex < series.length - 1"
                  >
                    <span
                      :class="[
                        getTrend({
                          series,
                          item: dp,
                          index: timeLabel.absoluteIndex,
                        }).arrow,
                      ]"
                      class="shrink-0"
                      style="vertical-align: middle"
                    />
                    {{
                      getTrend({
                        series,
                        item: dp,
                        index: timeLabel.absoluteIndex,
                      }).formattedValue
                    }}</span
                  >
                </template>
              </div>
            </div>
          </template>
        </VueUiXy>
      </ClientOnly>
    </div>
  </div>
</template>

<style>
.no-chart-transition path,
circle {
  transition: none !important;
  animation: none !important;
}
</style>
