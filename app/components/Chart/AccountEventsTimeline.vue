<script setup lang="ts">
import {
  VueUiXy,
  type VueUiXyDatasetItem,
  type VueUiXyConfig,
} from "vue-data-ui";
import { getCompleteDayRange } from "./chart";
import type { GitHubEvent, GitHubEventType } from "~~/shared/types/identity";
import { githubEventTypes } from "~~/shared/types/identity";
import { useElementSize } from "@vueuse/core";
import { useChartTooltipPosition } from "~/composables/useChartTooltipPosition";
import { useColors } from "~/composables/useColors";
import { identityConfig } from "@unveil/identity";
import { VueUiIcon } from "vue-data-ui/vue-ui-icon";

import("vue-data-ui/style.css");

const props = defineProps<{
  events: GitHubEvent[];
  classification?: "organic" | "mixed" | "automation";
}>();

const rootEl = shallowRef<HTMLElement | null>(null);
const chartLineRef = useTemplateRef("chartLineRef");

onMounted(async () => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);
const { width } = useElementSize(rootEl);

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

type VueUiXyAnnotation = NonNullable<
  NonNullable<VueUiXyConfig["chart"]>["annotations"]
>[number];

/**
 * NOTE: thresholds are assumed to have different values for each metric.
 * If 2 metrics share the same threshold, then you might consider merging them into a single one.
 */
const thresholds = computed<VueUiXyAnnotation[]>(() => {
  return Object.values(eventConfig.value)
    .filter((kpi) => selectedLegendItems.value.includes(kpi.name))
    .filter((kpi) => !!kpi.threshold)
    .map((kpi) => ({
      show: true,
      yAxis: {
        yTop: kpi.threshold,
        label: {
          position: "start", // or 'end', to alternate if needed to prevent overlap between contiguous labels
          text: `${kpi.name} (${kpi.threshold})`,
          offsetX: -12, // if position == 'end', needs to be adapted
          offsetY: kpi.labelOffsetY,
          fontSize: 16,
          backgroundColor: "transparent",
          color: kpi.color,
          border: { stroke: "transparent" },
        },
        line: {
          stroke: kpi.color,
          strokeWidth: 2,
          strokeDasharray: 6,
        },
      },
    }));
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

const hasEnoughDays = computed<boolean>(() => eventDays.value.length > 1);

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

const maxValBetweenDatasetAndThresholds = computed(() => {
  const maxDataset = Math.max(
    ...datasetLine.value
      .filter((s) => selectedLegendItems.value.includes(s.name))
      .flatMap((d) => d.series.map((v) => v ?? 0)),
  );
  const maxThreshold = Math.max(
    ...thresholds.value.map((t) => t.yAxis?.yTop ?? 0),
  );
  return Math.max(maxDataset, maxThreshold, 1);
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
    annotations: thresholds.value,
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
          scaleMax: maxValBetweenDatasetAndThresholds.value,
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
      <template #tooltip="{ datapoint, timeLabel }">
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
    </VueUiXy>
    <div
      v-if="isEmpty"
      class="w-full h-40 flex place-items-center justify-center"
    >
      <div class="flex flex-col items-center gap-4">
        <VueUiIcon name="chartSparkline" :stroke="colors.text" />
        <p class="text-gh-muted">No activity to display</p>
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
.svg-element-transition,
:deep(.vdui-shape-circle) {
  transition: all 0.5s var(--super-ease-out) !important;
}

@media (prefers-reduced-motion: reduce) {
  :deep(.vue-data-ui-component .serie_line_0 path),
  :deep(.vue-data-ui-component .serie_line_1 path),
  :deep(.vue-data-ui-component .serie_line_2 path),
  :deep(.vue-data-ui-component .serie_line_3 path),
  .svg-element-transition,
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
