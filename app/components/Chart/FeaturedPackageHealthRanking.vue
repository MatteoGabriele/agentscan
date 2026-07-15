<script setup lang="ts">
import { adaptColorToBackground } from 'vue-data-ui/utils'
import {
  VueUiHorizontalBar,
  type VueUiHorizontalBarDatasetItem,
  type VueUiHorizontalBarConfig,
} from 'vue-data-ui/vue-ui-horizontal-bar'
import { interpolateHexColors } from '~/utils/colors'
import('vue-data-ui/style.css')

const { data } = useEcosystemHealthCurrentWeek()

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)

const selectedDate = shallowRef<string | null>(null)

function setSelectedDate(date: string | null) {
  selectedDate.value = date
}

const healthData = computed(() => data.value?.results ?? [])

const source = computed(() => {
  return convertToHorizontalBarDataset(healthData.value, selectedDate.value)
})

const config = computed<VueUiHorizontalBarConfig>(() => {
  return {
    useCssAnimation: false,
    style: {
      chart: {
        backgroundColor: colors.value.bg,
        color: '#1A1A1Aff',
        width: 512,
        height: 450,
        layout: {
          bars: {
            rowColor: '#FFFFFF00',
            rowRadius: 4,
            sort: 'asc',
            useStroke: false,
            strokeWidth: 2,
            gap: 1,
            borderRadius: 2,
            offsetX: 12,
            paddingRight: 0,
            useGradient: false,
            fillOpacity: 100,
            underlayerColor: '#FFFFFF',
            dataLabels: {
              color: colors.value.textMuted,
              bold: true,
              fontSize: 8,
              value: {
                show: true,
                roundingValue: 1,
                prefix: '',
                suffix: '%',
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
              fontSize: 8,
              offsetX: 0,
            },
          },
          highlighter: {
            color: colors.value.text,
            opacity: 5,
          },
          separators: { show: false },
        },
        legend: { show: false },
        tooltip: {
          backgroundColor: colors.value.bg,
          color: colors.value.text,
          borderColor: colors.value.border,
          backgroundOpacity: 30,
        },
      },
    },
    userOptions: {
      show: false,
    },
  }
})

const max = computed(() => Math.max(...source.value.map((d) => d.value ?? 0)))

const dataset = computed<VueUiHorizontalBarDatasetItem[]>(() => {
  return source.value.map((d) => ({
    ...d,
    color: interpolateHexColors({
      colors: [colors.value.danger!, colors.value.amber!, colors.value.green!],
      ratio: (d.value ?? 0) / (max.value || 1),
    }),
    value: d.value,
  }))
})
</script>

<template>
  <div class="mb-5">
    <h2 class="text-center">Score breakdown per featured repository</h2>
  </div>
  <div class="flex flex-col w-full">
    <!-- FIXME: that crappy date selector would need some love -->
    <CommonDateSelector :source="healthData" @select-date="setSelectedDate" />
    <ClientOnly>
      <VueUiHorizontalBar :config="config" :dataset="dataset">
        <template #tooltip="{ datapoint }">
          <div class="flex flex-row gap-2 items-center justify-between">
            <div>{{ datapoint.name }}</div>
            <div
              :style="{
                background: datapoint.color,
                color: adaptColorToBackground(datapoint.color),
              }"
              class="py-0.5 px-2 rounded-xs"
            >
              {{ Math.round(datapoint.value * 10) / 10 }}%
            </div>
          </div>
        </template>
      </VueUiHorizontalBar>
    </ClientOnly>
  </div>
</template>
