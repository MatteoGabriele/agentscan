<script setup lang="ts">
import { computed, shallowRef } from "vue";
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXySeries,
  type VueUiXyTooltipSlotProps,
} from "vue-data-ui/vue-ui-xy";
import { identityConfig } from "@unveil/identity";
import { useTimeoutFn } from "@vueuse/core";

import("vue-data-ui/style.css");

const { data } = useEcosystemHealth();
const dates = computed(() => data.value?.dates);

const rootEl = shallowRef<HTMLElement | null>(null);
const colors = useColors(rootEl);

const loaded = shallowRef(false);

const { start } = useTimeoutFn(
  () => {
    loaded.value = true;
  },
  250,
  { immediate: false },
);

onMounted(start);

const scoreBounds = shallowRef<ScoreBounds>([
  0,
  identityConfig.THRESHOLD_SUSPICIOUS,
]);

const selectedRangeColor = computed(() => {
  const [minScore, maxScore] = scoreBounds.value;
  if (minScore === 0 && maxScore === identityConfig.THRESHOLD_SUSPICIOUS) {
    return colors.value.danger;
  }
  if (
    minScore === identityConfig.THRESHOLD_SUSPICIOUS &&
    maxScore === identityConfig.THRESHOLD_HUMAN
  ) {
    return colors.value.amber;
  }
  return colors.value.green;
});

const sparklines = computed(() => {
  return getClosedPrPercentageEvolutionByRepo(
    data.value?.results ?? [],
    scoreBounds.value,
  ).map((dataset) => {
    return dataset.map((datapoint) => ({
      ...datapoint,
      color: colors.value.textTransparent,
      dataLabels: false,
      suffix: "%",
    }));
  });
});

const selectedIndex = shallowRef<number | undefined>(undefined);
const selectedChartIndex = shallowRef<number | undefined>(undefined);

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  events: {
    datapointEnter: ({ seriesIndex }) => {
      selectedIndex.value = seriesIndex;
    },
    datapointLeave: () => {
      selectedIndex.value = undefined;
    },
  },
  chart: {
    userOptions: { show: false },
    legend: { show: false },
    zoom: { show: false },
    labels: {
      fontSize: 16,
    },
    tooltip: {
      show: true,
      teleportTo: "#sparklines",
      backgroundOpacity: 0,
      color: colors.value.text,
      borderColor: "transparent",
    },
    highlighter: {
      opacity: 0,
      useLine: true,
      lineDasharray: 0,
      color: selectedRangeColor.value,
    },
    padding: {
      top: 6,
      left: 4,
      right: 66,
      bottom: 0,
    },
    backgroundColor: colors.value.bg,
    height: 100,
    width: 450,
    grid: {
      position: "start",
      stroke: "transparent",
      labels: {
        show: false,
        xAxisLabels: {
          show: false,
          values: dates.value,
          datetimeFormatter: {
            enable: true,
            useUTC: true,
            locale: "en",
            options: {
              year: "dd MMM",
              month: "dd MMM",
              day: "dd MMM",
              minute: "dd MMM",
              second: "dd MMM",
            },
          },
        },
        yAxis: {
          scaleMin: 0,
          scaleMax: 100,
        },
      },
    },
  },
  line: {
    radius: 0,
    useGradient: false,
    dot: {
      useSerieColor: false,
      fill: selectedRangeColor.value,
      strokeWidth: 3,
      selectedRadius: 6,
    },
    labels: {
      show: true,
      color: colors.value.text,
      offsetY: -12,
    },
  },
}));

function getLastPlot(serie: Record<string, any>) {
  return Array.isArray(serie?.plots) ? serie.plots.at(-1) : null;
}

function getLastPlotTransform(serie: Record<string, any>) {
  const lastPlot = getLastPlot(serie);
  if (!lastPlot) return "";
  return `translate(${lastPlot.x}px, ${lastPlot.y}px)`;
}

function getLastPlotLabel(serie: Record<string, any>) {
  const lastPlot = getLastPlot(serie);
  const value = Number(lastPlot?.value ?? 0);
  return `${value.toFixed(0)}%`;
}

type XyAugmentedSeries = VueUiXySeries[number] & {
  details: { eligiblePrs: number[]; closedPrs: number[] };
};

function getTooltipContent(
  series: VueUiXyTooltipSlotProps["series"],
  timeLabel: VueUiXyTooltipSlotProps["timeLabel"],
) {
  const { absoluteIndex: index } = timeLabel;
  const datapoint = series[0] as unknown as XyAugmentedSeries;
  const eligible = datapoint?.details?.eligiblePrs?.[index];
  const closed = datapoint?.details?.closedPrs?.[index];
  if (closed == null || eligible == null) return "";
  const percentage =
    eligible === 0 ? 100 : Math.round((closed / eligible) * 100);
  return `${closed} / ${eligible} (${percentage}%)`;
}

function hideDataLabel(chartIndex: number) {
  return (
    selectedChartIndex.value === chartIndex ||
    (selectedIndex.value !== undefined &&
      selectedIndex.value === (dates.value?.length ?? 0) - 1)
  );
}
</script>

<template>
  <div class="mb-5">
    <h2 class="text-center">
      Evolution of pull request closure rates by repository for PRs in a given
      score range.
    </h2>
    <p class="text-sm text-gh-muted text-center">
      Closure rates are based on daily snapshots, not cumulative history, so
      counts may change from one day to the next.
    </p>
  </div>

  <div class="mb-4 flex items-center justify-center gap-6">
    <label class="font-medium">Score range</label>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="scoreBounds"
        type="radio"
        :value="[0, identityConfig.THRESHOLD_SUSPICIOUS]"
        class="accent-red"
      />
      <span>0-{{ identityConfig.THRESHOLD_SUSPICIOUS }}</span>
    </label>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="scoreBounds"
        type="radio"
        :value="[
          identityConfig.THRESHOLD_SUSPICIOUS,
          identityConfig.THRESHOLD_HUMAN,
        ]"
        class="accent-amber"
      />
      <span
        >{{ identityConfig.THRESHOLD_SUSPICIOUS }}-{{
          identityConfig.THRESHOLD_HUMAN
        }}</span
      >
    </label>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="scoreBounds"
        type="radio"
        :value="[identityConfig.THRESHOLD_HUMAN, 100]"
        class="accent-green"
      />
      <span>{{ identityConfig.THRESHOLD_HUMAN }}-100</span>
    </label>
  </div>

  <div
    class="grid grid-cols-2 gap-4 max-w-[600px] mx-auto"
    id="sparklines"
    :data-loaded="loaded"
  >
    <ClientOnly v-for="(chart, chartIndex) in sparklines" :key="chart[0]?.name">
      <div class="flex flex-col">
        <div class="text-sm mb-1">
          <span class="text-gh-muted">{{ chart[0]?.name.split("/")[0] }}/</span>
          <span>{{ chart[0]?.name.split("/")[1] }}</span>
        </div>

        <div
          class="w-full h-full border-gh-border border-l-0.5 border-b-0.5 rounded-bl overflow-hidden"
          v-if="chart[0]?.hasData"
          :data-hide-label="hideDataLabel(chartIndex)"
        >
          <VueUiXy
            :dataset="chart"
            :config
            :selected-x-index="selectedIndex"
            @mouseenter="selectedChartIndex = chartIndex"
          >
            <template #tooltip="{ series, timeLabel }">
              <div class="text-gh-muted flex flex-col text-center text-xs">
                <span>{{ timeLabel.text }}</span>
                {{ getTooltipContent(series, timeLabel) }}
              </div>
            </template>
            <template #svg="{ svg }">
              <g
                v-for="serie in Array.isArray(svg?.data) ? svg.data : []"
                :key="serie.id"
                class="last-datapoint"
                :style="{ transform: getLastPlotTransform(serie) }"
              >
                <text
                  class="value-label"
                  text-anchor="start"
                  dominant-baseline="middle"
                  x="12"
                  y="0"
                  font-size="18"
                  :fill="colors.text"
                  :stroke="colors.bg"
                  stroke-width="1"
                  paint-order="stroke fill"
                >
                  {{ getLastPlotLabel(serie) }}
                </text>

                <circle
                  class="value-plot"
                  cx="0"
                  cy="0"
                  r="6"
                  :fill="selectedRangeColor"
                  :stroke="colors.bg"
                  stroke-width="3"
                />
              </g>
            </template>
          </VueUiXy>
        </div>
        <div
          class="w-full h-full border-gh-border border-l-0.5 border-b-0.5 rounded-bl flex justify-center place-items-center"
          v-else
        >
          <span class="text-xs text-gh-muted">No data to display</span>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>

<style scoped>
:deep(.vue-data-ui-component) {
  --super-ease-out: cubic-bezier(0.15, 0.75, 0.35, 1);
}

[data-loaded="true"] :deep(.vue-data-ui-component path),
[data-loaded="true"] :deep(.last-datapoint),
[data-loaded="true"] :deep(.value-label),
[data-loaded="true"] :deep(.value-plot) {
  transition: all 0.5s var(--super-ease-out) !important;
}

[data-loaded="false"] :deep(.vue-data-ui-component path),
[data-loaded="false"] :deep(.last-datapoint),
[data-loaded="false"] :deep(.value-label),
[data-loaded="false"] :deep(.value-plot) {
  transition: none !important;
}
:deep(.vue-data-ui-component circle) {
  stroke: var(--bg);
}

:deep(.vdui-shape-circle) {
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.vue-data-ui-component path),
  :deep(.last-datapoint),
  :deep(.value-label),
  :deep(.value-plot) {
    transition: none !important;
  }
}

:deep([data-hide-label="true"] svg text:not(.value-label)) {
  display: none;
}
:deep(div:has(.vue-data-ui-xy-svg)) {
  border-radius: 12px !important;
}
</style>

<style>
#sparklines .vue-data-ui-tooltip {
  padding: 2px 6px !important;
}
</style>
