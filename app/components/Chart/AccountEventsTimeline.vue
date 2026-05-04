<script setup lang="ts">
import {
  VueUiStackline,
  type VueUiStacklineDatasetItem,
  type VueUiStacklineConfig,
} from "vue-data-ui/vue-ui-stackline";
import {
  getCompleteDayRange,
  eventTypes,
  type GitHubEventType,
  eventConfig,
} from "./chart";

// TODO: replace with a prop serving Array<GitHubEvent>
import accountData from "../../../mock-data/account-github-events.json";

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
  ],
  {
    element: rootEl,
  },
);

function isGitHubEventType(type: string | null): type is GitHubEventType {
  return type !== null && eventTypes.includes(type as GitHubEventType);
}

function getEventDays(events: GitHubEvent[]): string[] {
  return Array.from(
    new Set(
      events
        .filter((event) => event.created_at && isGitHubEventType(event.type))
        .map((event) => event.created_at!.slice(0, 10)),
    ),
  ).sort();
}

function createStacklineDataset(
  events: GitHubEvent[],
): VueUiStacklineDatasetItem[] {
  const days = getCompleteDayRange(getEventDays(events));

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

  return eventTypes.map((eventType) => ({
    name: eventConfig[eventType].name,
    color: eventConfig[eventType].color,
    series: days.map((day) => counts[eventType][day] || 0),
  }));
}

const dataset = computed<VueUiStacklineDatasetItem[]>(() => {
  return createStacklineDataset(accountData as GitHubEvent[]);
});

const timestamps = computed<number[]>(() => {
  return getCompleteDayRange(getEventDays(accountData as GitHubEvent[])).map(
    (day) => new Date(day).getTime(),
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
          color: colors.value.text,
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
  <div>
    <label>
      Distributed
      <input type="checkbox" v-model="isDistributed" />
    </label>
    <ClientOnly>
      <VueUiStackline :dataset="dataset" :config="config" />
      <template #fallback>
        <!-- TODO -->
        [SKELETON]
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
:deep(text.vue-data-ui-time-label) {
  display: none !important;
}

:deep(text.vue-data-ui-time-label:nth-of-type(1)),
:deep(text.vue-data-ui-time-label:nth-last-of-type(1)) {
  display: initial !important;
}
</style>
