<script setup lang="ts">
import {
  VueUiDonut,
  type VueUiDonutDatasetItem,
  type VueUiDonutConfig,
} from "vue-data-ui/vue-ui-donut";

const props = defineProps<{
  events: GitHubEvent[];
}>();

const eventConfig = {
  ForkEvent: {
    name: "Forks",
    color: "var(--event-fork)",
  },
  CreateEvent: {
    name: "New branches",
    color: "var(--event-branch)",
  },
  PullRequestEvent: {
    name: "Pull requests",
    color: "var(--event-pr)",
  },
};

function isSelectedEventType(type: string | null): type is GitHubEventType {
  return type !== null && githubEventTypes.includes(type as GitHubEventType);
}

const parsedAccountData = computed<GitHubEvent[]>(() => {
  return props.events.filter((event) =>
    isSelectedEventType(event.type),
  ) as GitHubEvent[];
});

const dataset = computed<VueUiDonutDatasetItem[]>(() => {
  const counts: Record<GitHubEventType, number> = {
    ForkEvent: 0,
    CreateEvent: 0,
    PullRequestEvent: 0,
  };

  for (const event of parsedAccountData.value) {
    if (isSelectedEventType(event.type)) {
      counts[event.type] += 1;
    }
  }

  return githubEventTypes.map((eventType) => ({
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
