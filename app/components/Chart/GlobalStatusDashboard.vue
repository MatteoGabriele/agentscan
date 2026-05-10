<script setup lang="ts">
import { type VueUiStacklineDatasetItem } from "vue-data-ui/vue-ui-stackline";
import { useColors } from "~/composables/useColors";
import { useElementSize } from "@vueuse/core";

const props = defineProps<{
  data: Scan[] | undefined;
}>();

const rootEl = shallowRef<HTMLElement | null>(null);
const chartContainer = useTemplateRef<HTMLElement>("chartContainer");

onMounted(async () => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);

function createChartDataset(source: Scan[] = []): {
  categories: string[];
  dataset: VueUiStacklineDatasetItem[];
} {
  const categories = [...new Set(source.map((item) => item.created_at))].sort();

  const sumsByDate: Record<
    string,
    {
      automation: number;
      mixed: number;
      organic: number;
    }
  > = {};

  categories.forEach((date) => {
    sumsByDate[date] = {
      automation: 0,
      mixed: 0,
      organic: 0,
    };
  });

  source.forEach((item) => {
    const dateSums = sumsByDate[item.created_at];

    if (!dateSums) return;

    if (item.score <= 50) {
      dateSums.automation += 1;
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
        name: "Organic",
        series: categories.map((date) => sumsByDate[date]?.organic ?? 0),
        color: colors.value.greenLine,
      },
      {
        name: "Mixed",
        series: categories.map((date) => sumsByDate[date]?.mixed ?? 0),
        color: colors.value.amber,
      },
      {
        name: "Automation",
        series: categories.map((date) => sumsByDate[date]?.automation ?? 0),
        color: colors.value.dangerHover,
      },
    ],
  };
}

const stacklineData = computed(() => createChartDataset(props.data ?? []));
const dataset = computed(() => stacklineData.value.dataset);

const timestamps = computed(() => {
  if (!props.data?.length) return [];

  return [...new Set(props.data.map((item) => item.created_at))].sort();
});

const { width, height } = useElementSize(chartContainer);
</script>

<template>
  <div class="relative h-full w-full flex flex-col">
    <div class="flex-1 h-full no-chart-transition" ref="chartContainer">
      <ChartGlobalEventsEvolution :data="dataset" :timestamps :width :height />
    </div>
  </div>
</template>

<style>
.no-chart-transition path,
circle {
  transition: none !important;
  animation: none !important;
}
</style>
