<script setup lang="ts">
import {
  VueUiSparkline,
  type VueUiSparklineConfig,
  type VueUiSparklineDatasetItem,
} from "vue-data-ui/vue-ui-sparkline";
import { getPalette } from "vue-data-ui/utils";
import { useColors } from "~/composables/useColors";
import type { VueUiStacklineDatasetItem } from "vue-data-ui/vue-ui-stackline";

const props = defineProps<{
  dataset?: Array<VueUiStacklineDatasetItem>;
  dates: string[];
  selectedXIndex: number | undefined;
}>();

const emit = defineEmits<{
  (e: "selectIndex", selectedIndex: number | undefined): void;
}>();

const rootEl = shallowRef<HTMLElement | null>(null);
const palette = getPalette("");

const step = ref(0);

onMounted(() => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);

const datasets = computed<VueUiSparklineDatasetItem[][]>(() => {
  return (props.dataset ?? []).map((unit) => {
    return props.dates.map((period, i) => {
      return {
        period,
        value: unit.series[i] ?? 0,
      };
    });
  });
});

const selectedIndex = computed<number | undefined>({
  get() {
    return props.selectedXIndex;
  },
  set(value) {
    emit("selectIndex", value);
  },
});

function hoverIndex({ index }: { index: number | undefined | null }) {
  selectedIndex.value = typeof index === "number" ? index : undefined;
}

function resetHover() {
  selectedIndex.value = undefined;
  step.value += 1;
}

const configs = computed(() => {
  return (props.dataset || []).map<VueUiSparklineConfig>((unit, i) => {
    const dashIndices = unit.dashIndices;

    // Ensure we loop through available palette colours when the series count is higher than the available palette
    const fallbackColor =
      palette[i] ?? palette[i % palette.length] ?? palette[0]!;
    const seriesColor = unit.color ?? fallbackColor;

    return {
      style: {
        backgroundColor: "transparent",
        animation: { show: false },
        chartWidth: 400,
        area: {
          color: unit.color,
          useGradient: false,
          opacity: 10,
        },
        dataLabel: {
          offsetX: -12,
          fontSize: 36,
          bold: false,
          color: unit.color,
          formatter: ({ value }) => {
            return Math.round(value);
          },
          datetimeFormatter: {
            enable: true,
            locale: "en",
            useUTC: true,
          },
        },
        line: {
          smooth: true,
          color: seriesColor,
          dashIndices,
          dashArray: 3,
        },
        plot: {
          radius: 6,
          stroke: colors.value.bg,
        },
        title: {
          show: false,
        },
        verticalIndicator: {
          strokeDasharray: 0,
          color: colors.value.text,
        },
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
    };
  });
});
</script>

<template>
  <div class="grid gap-8 sm:grid-cols-3 sm:px-16 mb-4">
    <ClientOnly v-for="(config, i) in configs" :key="`config_${i}`">
      <div
        @mouseleave="resetHover"
        @keydown.esc="resetHover"
        class="w-full max-w-[400px] mx-auto"
      >
        <VueUiSparkline
          v-if="datasets[i]"
          :key="`${i}_${step}`"
          :config
          :dataset="datasets[i]"
          :selectedIndex
          @hoverIndex="hoverIndex"
        >
          <template #skeleton>
            <!-- This empty div overrides the default built-in scanning animation on load -->
            <div></div>
          </template>
        </VueUiSparkline>
      </div>
    </ClientOnly>
  </div>
</template>
