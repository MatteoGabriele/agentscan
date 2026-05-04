<script setup lang="ts">
import {
  VueUiDonut,
  type VueUiDonutDatasetItem,
  type VueUiDonutConfig,
} from "vue-data-ui/vue-ui-donut";

// TODO: replace with a prop serving Array<GitHubEvent>
import accountData from "../../../mock-data/account-github-events.json";
import { eventConfig, eventTypes } from "./chart";

// TODO: replace with a prop
const username = "[USERNAME]";

type SelectedEventType = (typeof eventTypes)[number];

function isSelectedEventType(type: string | null): type is SelectedEventType {
  return type !== null && eventTypes.includes(type as SelectedEventType);
}

const parsedAccountData = computed<GitHubEvent[]>(() => {
  return accountData.filter((event) =>
    isSelectedEventType(event.type),
  ) as GitHubEvent[];
});

const dataset = computed<VueUiDonutDatasetItem[]>(() => {
  const counts: Record<SelectedEventType, number> = {
    ForkEvent: 0,
    CreateEvent: 0,
    PullRequestEvent: 0,
  };

  for (const event of parsedAccountData.value) {
    if (isSelectedEventType(event.type)) {
      counts[event.type] += 1;
    }
  }

  return eventTypes.map((eventType) => ({
    name: eventConfig[eventType].name,
    color: eventConfig[eventType].color,
    values: [counts[eventType]],
  }));
});

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

const config = computed<VueUiDonutConfig>(() => {
  return {
    userOptions: { show: false },
    useBlurOnHover: false,
    style: {
      chart: {
        backgroundColor: "transparent",
        useGradient: false,
        layout: {
          curvedMarkers: true,
          donut: {
            borderColorAuto: false,
            borderColor: colors.value.bg,
            useShadow: false,
          },
          labels: {
            dataLabels: {
              hideUnderValue: 0,
              smallArcClusterThreshold: 1,
            },
            percentage: {
              color: colors.value.textMuted,
              bold: false,
            },
            name: {
              color: colors.value.textMuted,
              bold: false,
            },
            hollow: {
              average: { show: false },
              total: {
                text: "Total",
                color: colors.value.textMuted,
                value: {
                  color: colors.value.textMuted,
                },
              },
            },
          },
        },
        legend: {
          show: false,
        },
        tooltip: {
          show: false,
        },
      },
    },
  };
});
</script>

<template>
  <ClientOnly>
    <VueUiDonut :dataset :config> </VueUiDonut>
    <template #fallback>
      <!-- TODO -->
      [SKELETON]
    </template>
  </ClientOnly>
</template>
