<script setup lang="ts">
import {
  VueUiXy,
  type VueUiXyDatasetItem,
  type VueUiXyConfig,
} from "vue-data-ui";
import { getCompleteDayRange } from "./chart";
import type { GitHubEvent, GitHubEventType } from "~~/shared/types/identity";
import { githubEventTypes } from "~~/shared/types/identity";
import { useChartTooltipPosition } from "~/composables/useChartTooltipPosition";
import { useColors } from "~/composables/useColors";
import { identityConfig, type IdentityClassification } from "@unveil/identity";
import { VueUiIcon } from "vue-data-ui/vue-ui-icon";
import type { VueUiXyDatasetLineItem } from "vue-data-ui/vue-ui-xy";

import("vue-data-ui/style.css");

const props = defineProps<{
  events: GitHubEvent[];
  classification?: IdentityClassification;
}>();

const rootEl = shallowRef<HTMLElement | null>(null);
const chartLineRef = useTemplateRef("chartLineRef");

onMounted(async () => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);

const metrics = ["Forks", "New branches", "Pull requests", "Total"];

const selectedLegendItems = ref(metrics);

function selectLegend(items: Array<{ color: string; name: string }>) {
  selectedLegendItems.value = items.map((i) => i.name);
}

const eventConfig = computed(() => {
  const classification = props.classification || "mixed";
  const palette = {
    organic: {
      pr: colors.value.eventOrganicPr,
      branch: colors.value.eventOrganicBranch,
      fork: colors.value.eventOrganicFork,
      comment: colors.value.eventOrganicComment,
    },
    mixed: {
      pr: colors.value.eventMixedPr,
      branch: colors.value.eventMixedBranch,
      fork: colors.value.eventMixedFork,
      comment: colors.value.eventMixedComment,
    },
    automation: {
      pr: colors.value.eventAutomationPr,
      branch: colors.value.eventAutomationBranch,
      fork: colors.value.eventAutomationFork,
      comment: colors.value.eventAutomationComment,
    },
  };

  const color = palette[classification];

  return {
    ForkEvent: {
      name: "Forks",
      color: color.fork,
      threshold: identityConfig.FORKS_EXTREME,
      visible: selectedLegendItems.value.includes("Forks"),
      labelOffsetY: 40,
    },
    CreateEvent: {
      name: "New branches",
      color: color.branch,
      threshold: null,
      visible: selectedLegendItems.value.includes("New branches"),
      labelOffsetY: 0,
    },
    PullRequestEvent: {
      name: "Pull requests",
      color: color.pr,
      threshold: identityConfig.PRS_TODAY_EXTREME,
      visible: selectedLegendItems.value.includes("Pull requests"),
      labelOffsetY: 6,
    },
  };
});

function isGitHubEventType(type: string | null): type is GitHubEventType {
  return type !== null && githubEventTypes.includes(type as GitHubEventType);
}

const eventDays = computed(() => {
  return Array.from(
    new Set(
      props.events
        .filter((event) => event.created_at && isGitHubEventType(event.type))
        .map((event) => event.created_at!.slice(0, 10)),
    ),
  ).sort();
});

const hasEnoughDays = computed<boolean>(() => eventDays.value.length > 4);

const activeGitHubEventTypes = computed(() => {
  return githubEventTypes.filter(
    (eventType) => eventType !== "IssueCommentEvent",
  );
});

function createLineDataset(events: GitHubEvent[]): VueUiXyDatasetItem[] {
  const days = getCompleteDayRange(eventDays.value);

  const counts: Record<GitHubEventType, Record<string, number>> = {
    PullRequestEvent: {},
    CreateEvent: {},
    ForkEvent: {},
    IssueCommentEvent: {},
  };

  for (const event of events) {
    if (!event.created_at || !isGitHubEventType(event.type)) {
      continue;
    }

    const day = event.created_at.slice(0, 10);

    counts[event.type][day] = (counts[event.type][day] || 0) + 1;
  }

  const individualEvents: VueUiXyDatasetItem[] =
    activeGitHubEventTypes.value.map((eventType) => {
      const config = eventConfig.value[eventType];

      return {
        type: "line",
        useArea: true,
        smooth: true,
        name: config.name,
        color: config.color,
        threshold: config.threshold,
        series: days.map((day) => counts[eventType][day] || 0),
      };
    });

  const totalEvents: VueUiXyDatasetItem = {
    type: "line",
    useArea: true,
    smooth: true,
    name: "Combined activity",
    color: colors.value.borderLight,
    series: days.map((_, index) => {
      return individualEvents.reduce((total, event) => {
        return total + Number(event.series[index]);
      }, 0);
    }),
  };

  return [...individualEvents, totalEvents];
}

const datasetLine = computed(() => createLineDataset(props.events));
const isEmpty = computed(
  () =>
    datasetLine.value
      .flatMap((d) => d.series)
      .reduce((a, b) => (a ?? 0) + (b ?? 0), 0) === 0,
);

const maxValue = computed(() => {
  const values = datasetLine.value
    .filter((s) => selectedLegendItems.value.includes(s.name))
    .flatMap((d) => d.series.map((v) => v ?? 0));
  return values.length ? Math.max(...values) : 0;
});

const timestamps = computed<number[]>(() => {
  return getCompleteDayRange(eventDays.value).map((day) =>
    new Date(day).getTime(),
  );
});

const tooltipPositionLine = useChartTooltipPosition(chartLineRef);

const configLine = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  line: {
    useGradient: false,
    dot: {
      useSerieColor: false,
      fill: colors.value.bg,
      strokeWidth: 1,
    },
  },
  bar: {
    useGradient: true,
  },
  chart: {
    userOptions: { show: false },
    backgroundColor: "transparent",
    color: colors.value.textMuted,
    padding: {
      top: 24, // leave space in case of alert icon on max chart value
    },
    highlighter: {
      useLine: true,
      color: colors.value.textMuted,
    },
    grid: {
      position: "middle",
      stroke: "transparent",
      labels: {
        show: false,
        yAxis: {
          scaleMax: maxValue.value,
          useNiceScale: false,
        },
        xAxisLabels: {
          show: true,
          color: colors.value.textMuted,
          values: timestamps.value,
          showOnlyAtModulo: true,
          modulo: 12,
          rotation: -30,
          autoRotate: {
            enable: false,
          },
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
      },
    },
    zoom: { show: false, keepState: true },
    tooltip: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 30,
      position: tooltipPositionLine.value,
      offsetX: 24,
      offsetY: -(selectedLegendItems.value.length * 18),
    },
  },
}));

type Datapoints = Array<VueUiXyDatasetLineItem & { threshold: number }>;

type PlotAlert = {
  name: string;
  coordinates: Array<{
    x: number;
    y: number;
    absoluteIndex: number;
    isAlert: boolean;
  }>;
};

function alertIcons(data: Datapoints, zoomOffset = 0): PlotAlert[] {
  return data
    .filter((d) => d.threshold !== null && d.threshold !== undefined)
    .map((d) => {
      return {
        name: d.name,
        coordinates: d.plots!.map((plot, index) => {
          const absoluteIndex = index + zoomOffset;

          return {
            ...plot,
            absoluteIndex,
            isAlert:
              d.absoluteValues[absoluteIndex] !== null &&
              d.absoluteValues[absoluteIndex]! >= d.threshold,
          };
        }),
      };
    });
}

function getSeriesThreshold(seriesName: string): number | null {
  const datasetItem = datasetLine.value.find(
    (item) => item.name === seriesName,
  );
  if (!datasetItem || !("threshold" in datasetItem)) return null;
  return datasetItem.threshold as number | null;
}

function isTooltipAlert(series: {
  name: string;
  value: number | null;
}): boolean {
  const threshold = getSeriesThreshold(series.name);
  return (
    threshold !== null && series.value !== null && series.value >= threshold
  );
}
</script>

<template>
  <ClientOnly>
    <VueUiXy
      v-if="hasEnoughDays && !isEmpty"
      ref="chartLineRef"
      :dataset="datasetLine"
      :config="configLine"
      @selectLegend="selectLegend"
    >
      <template #area-gradient="{ series, id }">
        <linearGradient :id="id" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" :stop-color="series.color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
        </linearGradient>
      </template>

      <!-- Remove this if you don't want the total series as bars -->
      <template #bar-gradient="{ series, positiveId }">
        <linearGradient :id="positiveId" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" :stop-color="series.color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="colors.bg" stop-opacity="0" />
        </linearGradient>
      </template>

      <!-- Custom tooltip -->
      <template #tooltip="{ datapoint, timeLabel, seriesIndex }">
        <div class="flex flex-col">
          <div class="mb-1">{{ timeLabel.text }}</div>
          <div
            class="flex flex-row gap-2 items-center"
            v-for="series in datapoint"
            :key="`${series.name}-${series.absoluteIndex}`"
          >
            <div class="h-2 w-2">
              <svg viewBox="0 0 2 2" class="w-full h-full">
                <circle cx="1" cy="1" r="1" :fill="series.color" />
              </svg>
            </div>
            <span :style="{ color: colors.textMuted }">{{ series.name }}</span>
            <span>{{ series.value }}</span>
            <svg
              v-if="isTooltipAlert(series)"
              viewBox="0 0 30 30"
              class="w-5 h-5"
              aria-hidden="true"
            >
              <path
                d="M 2 30 L 14 13 L 8 13 L 11 0 L 0 17 L 6 17 L 2 30"
                :fill="colors.amber"
                :stroke="colors.bg"
              />
            </svg>
          </div>
        </div>
      </template>

      <!-- Custom legend -->
      <template #legend="{ legend }">
        <div class="flex flex-row gap-4 justify-center mt-2">
          <button
            class="flex flex-row gap-1.5 place-items-center"
            :class="item.isSegregated ? 'opacity-50' : 'hover:underline'"
            v-for="item in legend"
            @click="item.segregate()"
          >
            <div class="w-2 h-2">
              <svg viewBox="0 0 2 2" class="w-full h-full">
                <circle :cx="1" :cy="1" :r="1" :fill="item.color" />
              </svg>
            </div>
            <div :class="`text-sm ${item.isSegregated ? 'line-through' : ''}`">
              {{ item.name }}
            </div>
          </button>
        </div>
      </template>

      <!-- Custom SVG content ⚡ -->
      <template #svg="{ svg }">
        <g
          v-for="alerts in alertIcons(svg.data as Datapoints, svg.slicer.start)"
          :key="alerts.name"
        >
          <template
            v-for="plot in alerts.coordinates"
            :key="`${alerts.name}-${plot.absoluteIndex}`"
          >
            <path
              v-if="plot.isAlert"
              class="svg-element-transition"
              :d="`M ${plot.x - 4} ${plot.y - 6} l 12 -17 l -6 0 l 3 -13 l -11 17 l 6 0 l -4 13`"
              :fill="colors.amber"
              :stroke="colors.bg"
            />
          </template>
        </g>
      </template>
    </VueUiXy>
    <div v-else class="w-full h-40 flex place-items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <span class="i-carbon:chart-line-smooth text-gh-muted"></span>
        <div class="flex flex-col items-center">
          <p class="text-gh-muted text-base">Insufficient activity data</p>
          <p class="text-gh-muted/50 text-sm">
            Not enough events to display a timeline
          </p>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<style scoped>
:deep(.vue-data-ui-component) {
  --super-ease-out: cubic-bezier(0.15, 0.75, 0.35, 1);
}

:deep(.vue-data-ui-component .serie_line_0 path),
:deep(.vue-data-ui-component .serie_line_1 path),
:deep(.vue-data-ui-component .serie_line_2 path),
:deep(.vue-data-ui-component .serie_line_3 path),
:deep(.vdui-shape-circle) {
  transition: all 0.5s var(--super-ease-out) !important;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.vue-data-ui-component .serie_line_0 path),
  :deep(.vue-data-ui-component .serie_line_1 path),
  :deep(.vue-data-ui-component .serie_line_2 path),
  :deep(.vue-data-ui-component .serie_line_3 path),
  :deep(.vdui-shape-circle) {
    transition: none !important;
  }
}

:deep(.vue-ui-xy-annotation-label) {
  stroke: var(--bg);
  stroke-width: 4;
  paint-order: stroke;
}
</style>
