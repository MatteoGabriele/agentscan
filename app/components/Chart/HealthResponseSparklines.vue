<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { VueUiXy, type VueUiXyConfig } from "vue-data-ui/vue-ui-xy";
import "vue-data-ui/style.css";

const { data } = useEcosystemHealth();
const rootEl = shallowRef<HTMLElement | null>(null);
const colors = useColors(rootEl);

const scoreBounds = shallowRef<ScoreBounds>([0, 50]);

const selectedRangeColor = computed(() => {
  const [minScore, maxScore] = scoreBounds.value;
  if (minScore === 0 && maxScore === 50) {
    return colors.value.danger;
  }
  if (minScore === 50 && maxScore === 70) {
    return colors.value.amber;
  }
  return colors.value.green;
});

const sparklines = computed(() => {
  return getClosedPrPercentageEvolutionByRepo(
    data.value ?? [],
    scoreBounds.value,
  ).map((dataset) => {
    return dataset.map((datapoint) => ({
      ...datapoint,
      color: colors.value.textMuted,
    }));
  });
});

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  chart: {
    userOptions: { show: false },
    legend: { show: false },
    tooltip: { show: false },
    zoom: { show: false },
    highlighter: { opacity: 0 },
    padding: {
      top: 6,
      left: 4,
      right: 66,
      bottom: 0,
    },
    backgroundColor: "transparent",
    height: 100,
    width: 450,
    grid: {
      position: "start",
      stroke: "transparent",
      labels: {
        show: false,
        xAxisLabels: {
          show: false,
        },
        yAxis: {
          scaleMin: 0,
          scaleMax: 100,
        },
      },
    },
  },
  line: {
    radius: Number.MIN_VALUE,
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
</script>

<template>
  <h2 class="text-center mb-3">
    Evolution of pull request closure rates by repository for PRs in a given
    score range.
  </h2>

  <div class="mb-4 flex items-center justify-center gap-6">
    <label class="font-medium">Score range</label>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="scoreBounds"
        type="radio"
        :value="[0, 50]"
        class="accent-red"
      />
      <span>0-50</span>
    </label>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="scoreBounds"
        type="radio"
        :value="[50, 70]"
        class="accent-amber"
      />
      <span>50-70</span>
    </label>

    <label class="flex items-center gap-2 cursor-pointer">
      <input
        v-model="scoreBounds"
        type="radio"
        :value="[70, 100]"
        class="accent-green"
      />
      <span>70-100</span>
    </label>
  </div>

  <div class="grid grid-cols-2 gap-4 max-w-[600px] mx-auto">
    <ClientOnly v-for="chart in sparklines" :key="chart[0]?.name">
      <div class="flex flex-col">
        <div class="text-sm mb-1">
          <span class="text-gh-muted">{{ chart[0]?.name.split("/")[0] }}/</span>
          <span>{{ chart[0]?.name.split("/")[1] }}</span>
        </div>

        <div
          class="w-full h-full border-gh-border border-l border-b rounded-bl"
          v-if="chart[0]?.hasData"
        >
          <VueUiXy :dataset="chart" :config="config">
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
          class="v-else w-full h-full border-gh-border border-l border-b rounded-bl flex justify-center place-items-center"
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

:deep(.vue-data-ui-component svg:focus-visible) {
  outline: none !important;
}

:deep(.vue-data-ui-component path),
:deep(.last-datapoint),
:deep(.value-label),
:deep(.value-plot) {
  transition: all 0.5s var(--super-ease-out) !important;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.vue-data-ui-component path),
  :deep(.last-datapoint),
  :deep(.value-label),
  :deep(.value-plot) {
    transition: none !important;
  }
}
</style>
