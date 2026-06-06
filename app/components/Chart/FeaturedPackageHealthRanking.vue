<script setup lang="ts">
import {
  VueUiHorizontalBar,
  type VueUiHorizontalBarDatasetItem,
  type VueUiHorizontalBarConfig,
} from "vue-data-ui/vue-ui-horizontal-bar";
import "vue-data-ui/style.css";
import { interpolateHexColors } from "~/utils/colors";

const { data } = useEcosystemHealth();

const rootEl = shallowRef<HTMLElement | null>(null);
const colors = useColors(rootEl);

const selectedDate = shallowRef<string | null>(null);

function setSelectedDate(date: string | null) {
  selectedDate.value = date;
}

const healthData = computed(() => data.value ?? []);

const source = computed(() => {
  return convertToHorizontalBarDataset(healthData.value, selectedDate.value);
});

const config = computed<VueUiHorizontalBarConfig>(() => {
  return {
    useCssAnimation: false,
    style: {
      chart: {
        backgroundColor: "transparent",
        color: "#1A1A1Aff",
        width: 512,
        height: 316,
        layout: {
          bars: {
            rowColor: "#FFFFFF00",
            rowRadius: 4,
            sort: "desc",
            useStroke: false,
            strokeWidth: 2,
            height: 32,
            gap: 1,
            borderRadius: 2,
            offsetX: 12,
            paddingRight: 0,
            useGradient: false,
            gradientIntensity: 20,
            fillOpacity: 100,
            underlayerColor: "#FFFFFF",
            dataLabels: {
              color: colors.value.textMuted,
              bold: true,
              fontSize: 12,
              value: {
                show: true,
                roundingValue: 1,
                prefix: "",
                suffix: "%",
                formatter: null,
              },
              percentage: {
                show: false,
                roundingPercentage: 0,
              },
              offsetX: 3,
            },
            nameLabels: {
              show: true,
              color: colors.value.textMuted,
              bold: false,
              fontSize: 12,
              offsetX: 0,
            },
          },
          highlighter: {
            color: colors.value.text,
            opacity: 0,
          },
          separators: { show: false },
        },
        legend: { show: false },
        tooltip: {
          show: false,
        },
      },
    },
    userOptions: {
      show: false,
    },
  };
});

const max = computed(() => Math.max(...source.value.map((d) => d.value ?? 0)));

const dataset = computed<VueUiHorizontalBarDatasetItem[]>(() => {
  return source.value.map((d) => ({
    ...d,
    color: interpolateHexColors({
      colors: [colors.value.danger!, colors.value.amber!, colors.value.green!],
      ratio: (d.value ?? 0) / (max.value || 1),
    }),
    value: d.value,
  }));
});
</script>
<template>
  <div class="flex flex-col w-full">
    <!-- FIXME: that crappy date selector would need some love -->
    <CommonDateSelector :source="healthData" @select-date="setSelectedDate" />
    <ClientOnly>
      <VueUiHorizontalBar :config="config" :dataset="dataset" />
    </ClientOnly>
  </div>
</template>
