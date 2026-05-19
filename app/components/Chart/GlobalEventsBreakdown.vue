<script setup lang="ts">
import {
  VueUiSparkStackbar,
  type VueUiSparkStackbarDatasetItem,
  type VueUiSparkStackbarConfig,
} from "vue-data-ui/vue-ui-sparkstackbar";
import type { VueUiStacklineDatasetItem } from "vue-data-ui/vue-ui-stackline";
import { useColors } from "~/composables/useColors";

const props = defineProps<{
  data: Array<VueUiStacklineDatasetItem>;
}>();

const rootEl = shallowRef<HTMLElement | null>(null);

onMounted(() => {
  rootEl.value = document.documentElement;
});

const colors = useColors(rootEl);

const dataset = computed<VueUiSparkStackbarDatasetItem[]>(() =>
  props.data.map((d) => ({
    ...d,
    value: d.series.reduce((a, b) => (a ?? 0) + (b ?? 0), 0),
  })),
);

const config = computed<VueUiSparkStackbarConfig>(() => ({
  style: {
    backgroundColor: colors.value.bg,
    animation: { show: false },
    bar: {
      gradient: { show: false },
    },
    legend: {
      textAlign: "center",
      name: {
        color: colors.value.text,
      },
      percentage: {
        bold: false,
        color: colors.value.textMuted,
      },
      value: {
        color: colors.value.textMuted,
      },
    },
    tooltip: { show: false },
  },
}));
</script>

<template>
  <ClientOnly>
    <VueUiSparkStackbar :dataset :config></VueUiSparkStackbar>
  </ClientOnly>
</template>
