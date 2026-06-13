<script setup lang="ts">
import {
  VueUiXy,
  type VueUiXyDatasetItem,
  type VueUiXyConfig,
} from "vue-data-ui";
import { getCompleteDayRange } from "~~/shared/utils/charts";
import type { GitHubEventType } from "~~/shared/types/identity";
import { githubEventTypes } from "~~/shared/types/identity";
import { useChartTooltipPosition } from "~/composables/useChartTooltipPosition";
import { useColors } from "~/composables/useColors";
import {
  identityConfig,
  type IdentityClassification,
  type GitHubEvent,
} from "@unveil/identity";
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

const locale = computed(() => "en"); // in case i18n is implemented in the future

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

const dayRangeLimit = 90;

function isGitHubEventType(type: string | null): type is GitHubEventType {
  return type !== null && githubEventTypes.includes(type as GitHubEventType);
}

const activeGitHubEventTypes = [
  "PullRequestEvent",
  "CreateEvent",
  "ForkEvent",
] as const satisfies readonly GitHubEventType[];

type ActiveGitHubEventType = Exclude<GitHubEventType, "IssueCommentEvent">;

function isActiveGitHubEventType(
  type: GitHubEventType,
): type is ActiveGitHubEventType {
  return activeGitHubEventTypes.includes(type as ActiveGitHubEventType);
}

const eventDays = computed(() => {
  const days = Array.from(
    new Set(
      props.events
        .filter((event) => {
          return (
            event.created_at &&
            isGitHubEventType(event.type) &&
            isActiveGitHubEventType(event.type)
          );
        })
        .map((event) => event.created_at!.slice(0, 10)),
    ),
  ).sort();

  const lastDay = days.at(-1);
  if (!lastDay) return [];

  const startDate = new Date(`${lastDay}T00:00:00.000Z`);
  startDate.setUTCDate(startDate.getUTCDate() - dayRangeLimit + 1);
  const startDay = startDate.toISOString().slice(0, 10);
  return days.filter((day) => day >= startDay);
});

const limitedEvents = computed(() => {
  const firstDay = eventDays.value[0];
  if (!firstDay) return [];
  return props.events.filter((event) => {
    return (
      event.created_at &&
      isGitHubEventType(event.type) &&
      isActiveGitHubEventType(event.type) &&
      event.created_at.slice(0, 10) >= firstDay
    );
  });
});

const completeDayLabels = computed<string[]>(() => {
  return getCompleteDayRange(eventDays.value);
});

const usesHourlyGranularity = computed<boolean>(() => {
  return completeDayLabels.value.length <= 2;
});

function roundToClosestHour(date: Date): Date {
  const rounded = new Date(date);
  if (rounded.getUTCMinutes() >= 30) {
    rounded.setUTCHours(rounded.getUTCHours() + 1);
  }
  rounded.setUTCMinutes(0, 0, 0);
  return rounded;
}

function getCompleteHourRange(events: GitHubEvent[]): string[] {
  const timestamps = events
    .filter((event) => event.created_at && isGitHubEventType(event.type))
    .map((event) => roundToClosestHour(new Date(event.created_at!)).getTime())
    .sort((a, b) => a - b);

  const firstTimestamp = timestamps[0];
  const lastTimestamp = timestamps[timestamps.length - 1];

  if (firstTimestamp === undefined || lastTimestamp === undefined) return [];

  const start = new Date(firstTimestamp);
  const end = new Date(lastTimestamp);
  const hours: string[] = [];
  const cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    hours.push(cursor.toISOString().slice(0, 13));
    cursor.setUTCHours(cursor.getUTCHours() + 1);
  }

  return hours;
}

const timeLabels = computed<string[]>(() => {
  return usesHourlyGranularity.value
    ? getCompleteHourRange(limitedEvents.value)
    : completeDayLabels.value;
});

const hasEnoughDays = computed<boolean>(() => eventDays.value.length > 1);

const hasEnoughHours = computed<boolean>(() => {
  return !usesHourlyGranularity.value || timeLabels.value.length > 1;
});

const hasEnoughDataPoints = computed<boolean>(() => {
  return usesHourlyGranularity.value
    ? hasEnoughHours.value
    : hasEnoughDays.value;
});

function createLineDataset(events: GitHubEvent[]): VueUiXyDatasetItem[] {
  const counts: Record<GitHubEventType, Record<string, number>> = {
    PullRequestEvent: {},
    CreateEvent: {},
    ForkEvent: {},
    IssueCommentEvent: {},
  };

  for (const event of events) {
    if (!event.created_at || !isGitHubEventType(event.type)) continue;

    const label = usesHourlyGranularity.value
      ? roundToClosestHour(new Date(event.created_at!))
          .toISOString()
          .slice(0, 13)
      : event.created_at.slice(0, 10);

    counts[event.type][label] = (counts[event.type][label] || 0) + 1;
  }

  const individualEvents: VueUiXyDatasetItem[] = activeGitHubEventTypes.map(
    (eventType) => {
      const config = eventConfig.value[eventType];
      return {
        type: "line",
        useArea: true,
        smooth: true,
        name: config.name,
        color: config.color,
        threshold: config.threshold,
        series: timeLabels.value.map((label) => counts[eventType][label] || 0),
      };
    },
  );

  const totalEvents: VueUiXyDatasetItem = {
    type: "line",
    useArea: true,
    smooth: true,
    name: "Combined activity",
    color: colors.value.textTransparent,
    series: timeLabels.value.map((_, index) => {
      return individualEvents.reduce((total, event) => {
        return total + Number(event.series[index]);
      }, 0);
    }),
  };

  return [...individualEvents, totalEvents];
}

const datasetLine = computed(() => createLineDataset(limitedEvents.value));

const isEmpty = computed(
  () =>
    datasetLine.value
      .flatMap((d) => d.series as (number | null)[])
      .reduce((a, b) => (a ?? 0) + (b ?? 0), 0) === 0,
);

const maxValue = computed(() => {
  const values = datasetLine.value
    .filter((s) => selectedLegendItems.value.includes(s.name))
    .flatMap((d) => d.series.map((v) => v ?? 0)) as number[];
  return values.length ? Math.max(...values) : 0;
});

const timestamps = computed<number[]>(() => {
  return timeLabels.value.map((label) => {
    return usesHourlyGranularity.value
      ? new Date(`${label}:00:00.000Z`).getTime()
      : new Date(label).getTime();
  });
});

const xAxisLabelValues = computed<string[]>(() => {
  const dates = timeLabels.value.map((label) => {
    return usesHourlyGranularity.value
      ? new Date(`${label}:00:00.000Z`)
      : new Date(label);
  });

  const hasMidnight = dates.some((date) => {
    return date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
  });

  return dates.map((date, index) => {
    if (!usesHourlyGranularity.value) {
      return new Intl.DateTimeFormat(locale.value, {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
      }).format(date);
    }

    const isMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
    const shouldShowDay = isMidnight || (!hasMidnight && index === 0);

    return new Intl.DateTimeFormat(locale.value, {
      timeZone: "UTC",
      ...(shouldShowDay
        ? {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        : {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
    }).format(date);
  });
});

const tooltipPositionLine = useChartTooltipPosition(chartLineRef);

const configLine = computed<VueUiXyConfig>(() => ({
  downsample: {
    threshold: 5000,
  },
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
      opacity: 0,
      color: colors.value.textMuted,
    },
    grid: {
      position: "start",
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
          values: xAxisLabelValues.value,
          showOnlyAtModulo: !usesHourlyGranularity.value,
          modulo: 12,
          rotation: -30,
          autoRotate: { enable: false },
          datetimeFormatter: { enable: false },
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

const tooltipTimeLabels = computed<string[]>(() => {
  return timestamps.value.map((timestamp) => {
    return new Intl.DateTimeFormat(locale.value, {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      ...(usesHourlyGranularity.value
        ? {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        : {}),
    }).format(timestamp);
  });
});

function getTooltipTimeLabel(index: number): string {
  return tooltipTimeLabels.value[index] ?? "";
}

function getZapIconPath({ x, y }: { x: number; y: number }) {
  // ⚡ with relative coordinates from initial position
  return `M ${x} ${y} l 12 -17 l -6 0 l 3 -13 l -11 17 l 6 0 l -4 13`;
}
</script>

<template>
  <ClientOnly>
    <VueUiXy
      v-if="hasEnoughDataPoints && !isEmpty"
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

      <!-- Custom tooltip -->
      <template #tooltip="{ datapoint, seriesIndex }">
        <div class="flex flex-col">
          <div class="mb-1">
            {{ getTooltipTimeLabel(seriesIndex) }}
          </div>
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
                :d="getZapIconPath({ x: 2, y: 30 })"
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
              v-show="plot.isAlert"
              :d="
                getZapIconPath({
                  x: plot.x - 4,
                  y: plot.y - 6,
                })
              "
              :fill="colors.amber"
              :stroke="colors.bg"
            />
          </template>
        </g>
      </template>
    </VueUiXy>
    <div v-else class="w-full h-40 flex place-items-center justify-center">
      <div class="flex flex-col items-center gap-4">
        <span class="i-lucide:circle-dashed text-gh-muted"></span>
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
