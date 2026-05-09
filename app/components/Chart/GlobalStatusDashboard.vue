<script setup lang="ts">
import { type VueUiStacklineDatasetItem } from "vue-data-ui/vue-ui-stackline";
import { useColors } from "~/composables/useColors";

const props = defineProps<{
  data: Scan[] | undefined;
}>();

const rootEl = shallowRef<HTMLElement | null>(null);

onMounted(async () => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);

function createStacklineDataset(source: Scan[] = []): {
  categories: string[];
  dataset: VueUiStacklineDatasetItem[];
} {
  const categories = [...new Set(source.map((item) => item.created_at))].sort();

  const sumsByDate: Record<
    string,
    {
      automated: number;
      mixed: number;
      organic: number;
    }
  > = {};

  categories.forEach((date) => {
    sumsByDate[date] = {
      automated: 0,
      mixed: 0,
      organic: 0,
    };
  });

  source.forEach((item) => {
    const dateSums = sumsByDate[item.created_at];

    if (!dateSums) return;

    if (item.score <= 50) {
      dateSums.automated += 1;
    } else if (item.score <= 70) {
      dateSums.mixed += 1;
    } else {
      dateSums.organic += 1;
    }
  });

  return {
    categories,
    dataset: [
      {
        name: "automated",
        series: categories.map((date) => sumsByDate[date]?.automated ?? 0),
        color: colors.value.red,
      },
      {
        name: "mixed",
        series: categories.map((date) => sumsByDate[date]?.mixed ?? 0),
        color: colors.value.dangerHover,
      },
      {
        name: "organic",
        series: categories.map((date) => sumsByDate[date]?.organic ?? 0),
        color: colors.value.green,
      },
    ],
  };
}

const stacklineData = computed(() => createStacklineDataset(props.data ?? []));
const dataset = computed(() => stacklineData.value.dataset);

const timestamps = computed(() => {
  if (!props.data?.length) return [];

  return [...new Set(props.data.map((item) => item.created_at))].sort();
});
</script>

<template>
  <ChartGlobalEventsBreakdown :data="dataset" />
  <ChartGlobalEventsEvolution :data="dataset" :timestamps />
</template>
