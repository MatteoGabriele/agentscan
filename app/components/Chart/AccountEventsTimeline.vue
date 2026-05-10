<script setup lang="ts">
import {
  VueUiXy,
  type VueUiXyDatasetItem,
  type VueUiXyConfig,
} from "vue-data-ui";
import {
  VueUiStackline,
  type VueUiStacklineDatasetItem,
  type VueUiStacklineConfig,
} from "vue-data-ui/vue-ui-stackline";
import { getCompleteDayRange } from "./chart";
import type { GitHubEvent, GitHubEventType } from "~~/shared/types/identity";
import { githubEventTypes } from "~~/shared/types/identity";
import "vue-data-ui/style.css";
import { useElementSize } from "@vueuse/core";
import { useChartTooltipPosition } from "~/composables/useChartTooltipPosition";
import { useColors } from "~/composables/useColors";

import("vue-data-ui/style.css");

const props = defineProps<{
  events: GitHubEvent[];
  classification?: "organic" | "mixed" | "automation";
}>();

const rootEl = shallowRef<HTMLElement | null>(null);
const chartRef = useTemplateRef("chartRef"); // TODO: remove for stackline
const chartLineRef = useTemplateRef("chartLineRef");

onMounted(async () => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);
const { width } = useElementSize(rootEl);

const mdBreakpoint = 768; // TODO: remove for stackline
const isAboveMd = computed(() => width.value >= mdBreakpoint); // TODO: remove for stackline

const metrics = ["Forks", "New branches", "Pull requests", "Comments", "Total"];

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
      threshold: 10, // FIXME: plug real threshold
      visible: selectedLegendItems.value.includes("Forks"),
    },
    CreateEvent: {
      name: "New branches",
      color: color.branch,
      threshold: 20, // FIXME: plug real threshold
      visible: selectedLegendItems.value.includes("New branches"),
    },
    PullRequestEvent: {
      name: "Pull requests",
      color: color.pr,
      threshold: 30, // FIXME: plug real threshold
      visible: selectedLegendItems.value.includes("Pull requests"),
    },
    IssueCommentEvent: {
      name: "Comments",
      color: color.comment,
      threshold: 50, // FIXME: plug real threshold
      visible: selectedLegendItems.value.includes("Comments"),
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
    .map((kpi) => ({
      show: true,
      yAxis: {
        yTop: kpi.threshold,
        label: {
          position: "start", // or 'end', to alternate if needed to prevent overlap between contiguous labels
          text: `${kpi.name} (${kpi.threshold})`,
          offsetX: -12, // if position == 'end', needs to be adapted
          offsetY: 6,
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

  const individualEvents: VueUiXyDatasetItem[] = githubEventTypes.map(
    (eventType) => {
      const config = eventConfig.value[eventType];

      return {
        type: "line",
        useArea: true,
        smooth: true,
        name: config.name,
        color: config.color,
        series: days.map((day) => counts[eventType][day] || 0),
      };
    },
  );

  const totalEvents: VueUiXyDatasetItem = {
    type: "line", // or 'bar' if you prefer
    useArea: true,
    smooth: true,
    name: "Total",
    color: colors.value.borderLight,
    series: days.map((_, index) => {
      return individualEvents.reduce((total, event) => {
        return total + Number(event.series[index]);
      }, 0);
    }),
  };

  return [...individualEvents, totalEvents];
}

// TODO: Remove for stackline
function createStacklineDataset(
  events: GitHubEvent[],
): VueUiStacklineDatasetItem[] {
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

  return githubEventTypes.map((eventType) => {
    const config = eventConfig.value[eventType];
    return {
      name: config.name,
      color: config.color,
      series: days.map((day) => counts[eventType][day] || 0),
    };
  });
}

// TODO: remove for stackline
const dataset = computed<VueUiStacklineDatasetItem[]>(() => {
  return createStacklineDataset(props.events);
});

const datasetLine = computed(() => createLineDataset(props.events));

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

// true: show as percentages
const isDistributed = shallowRef(false); // TODO: remove for stackline

const tooltipPosition = useChartTooltipPosition(chartRef); // TODO: remove for stackline
const tooltipPositionLine = useChartTooltipPosition(chartLineRef);

// TODO: remove for stackline
const config = computed<VueUiStacklineConfig>(() => {
  return {
    userOptions: { show: false },
    style: {
      chart: {
        backgroundColor: "transparent",
        grid: {
          x: {
            axisColor: colors.value.border,
            timeLabels: {
              color: colors.value.textMuted,
              rotation: -30,
              autoRotate: {
                enable: false,
              },
              values: timestamps.value,
              showOnlyAtModulo: true,
              modulo: 12,
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
          y: {
            showAxis: false,
            axisLabels: { show: false },
          },
        },
        highlighter: {
          useLine: true,
          color: colors.value.text,
          opacity: 0,
        },
        legend: {
          backgroundColor: "transparent",
          color: colors.value.textMuted,
        },
        lines: {
          useArea: true,
          areaOpacity: 1,
          smooth: true,
          distributed: isDistributed.value,
          gradient: { show: false },
          totalValues: { show: false },
          dataLabels: { show: false },
          path: {
            useSerieColor: false,
            stroke: "transparent",
          },
          dot: {
            stroke: "#FFFFFF",
            radius: 0,
          },
        },
        padding: {
          left: 48,
          right: 48,
        },
        tooltip: {
          backgroundColor: colors.value.bg,
          color: colors.value.text,
          borderColor: colors.value.border,
          backgroundOpacity: 30,
          position: tooltipPosition.value,
          offsetX: 24,
          offsetY: -64,
          fontSize: isAboveMd.value ? undefined : 10,
        },
        zoom: {
          show: false,
        },
      },
    },
  };
});

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
          useNiceScale: true,
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
    <!-- TODO: remove stackline ? -->
    <VueUiStackline
      v-if="hasEnoughDays"
      ref="chartRef"
      :dataset="dataset"
      :config="config"
    />
    <VueUiXy
      v-if="hasEnoughDays"
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
            <div class="h-3 w-3">
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
            <div class="w-3 h-3">
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
</style>
