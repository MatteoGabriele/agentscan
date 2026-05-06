<script setup lang="ts">
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

const props = defineProps<{
  events: GitHubEvent[];
  classification?: "organic" | "mixed" | "automation";
}>();

const rootEl = shallowRef<HTMLElement | null>(null);

onMounted(async () => {
  rootEl.value = document.documentElement;
});

const { width } = useElementSize(rootEl);

const mdBreakpoint = 768;

const isAboveMd = computed(() => width.value >= mdBreakpoint);

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

const eventConfig = computed(() => {
  const classification = props.classification || "mixed";
  const palette = {
    organic: {
      pr: colors.value.eventOrganicPr,
      branch: colors.value.eventOrganicBranch,
      fork: colors.value.eventOrganicFork,
    },
    mixed: {
      pr: colors.value.eventMixedPr,
      branch: colors.value.eventMixedBranch,
      fork: colors.value.eventMixedFork,
    },
    automation: {
      pr: colors.value.eventAutomationPr,
      branch: colors.value.eventAutomationBranch,
      fork: colors.value.eventAutomationFork,
    },
  };

  const color = palette[classification];

  return {
    ForkEvent: {
      name: "Forks",
      color: color.fork,
    },
    CreateEvent: {
      name: "New branches",
      color: color.branch,
    },
    PullRequestEvent: {
      name: "Pull requests",
      color: color.pr,
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

const hasEnoughDays = computed<boolean>(() => eventDays.value.length > 1);

function createStacklineDataset(
  events: GitHubEvent[],
): VueUiStacklineDatasetItem[] {
  const days = getCompleteDayRange(eventDays.value);

  const counts: Record<GitHubEventType, Record<string, number>> = {
    PullRequestEvent: {},
    CreateEvent: {},
    ForkEvent: {},
  };

  for (const event of events) {
    if (!event.created_at || !isGitHubEventType(event.type)) {
      continue;
    }

    const day = event.created_at.slice(0, 10);

    counts[event.type][day] = (counts[event.type][day] || 0) + 1;
  }

  return githubEventTypes.map((eventType) => ({
    name: eventConfig.value[eventType].name,
    color: eventConfig.value[eventType].color,
    series: days.map((day) => counts[eventType][day] || 0),
  }));
}

const dataset = computed<VueUiStacklineDatasetItem[]>(() => {
  return createStacklineDataset(props.events);
});

const timestamps = computed<number[]>(() => {
  return getCompleteDayRange(eventDays.value).map((day) =>
    new Date(day).getTime(),
  );
});

// true: show as percentages
const isDistributed = shallowRef(false);

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
          offsetY: isAboveMd.value ? -64 : undefined,
          fontSize: isAboveMd.value ? undefined : 10,
        },
        zoom: {
          show: false,
        },
      },
    },
  };
});
</script>

<template>
  <ClientOnly>
    <VueUiStackline v-if="hasEnoughDays" :dataset="dataset" :config="config" />
  </ClientOnly>
</template>

<style>
@media screen and (min-width: 768px) {
  .vue-data-ui-tooltip {
    margin-left: 130px !important;
  }
}
</style>
