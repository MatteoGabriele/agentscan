<script setup lang="ts">
import {
  VueUiWaffle,
  type VueUiWaffleConfig,
  type VueUiWaffleDatasetItem,
} from 'vue-data-ui/vue-ui-waffle'

import 'vue-data-ui/style.css'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

console.log(VueUiWaffle)

const { data: hourlyWindow } = await useEcosystemHealthHourlyWindow()

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)

onMounted(() => {
  rootEl.value = document.documentElement
})

const scanItems = computed<
  Array<{ date: string; data: VueUiWaffleDatasetItem[] }>
>(() => {
  const entries = Object.entries(
    hourlyWindow.value?.countsByScanTime ?? {},
  ).slice(-24) // removing the first one so we have an even number of hours

  return entries.map(([date, item]) => ({
    date: dayjs.utc(date).format('HH:mm'),
    data: [
      {
        name: 'Organic',
        values: [item.organic?.count ?? 0],
        color: colors.value.organic,
      },
      {
        name: 'Mixed',
        values: [item.mixed?.count ?? 0],
        color: colors.value.mixed,
      },
      {
        name: 'Automation',
        values: [item.automation?.count ?? 0],
        color: colors.value.automation,
      },
    ],
  }))
})

const waffles = computed<
  Array<{
    config: VueUiWaffleConfig & { time: string }
    dataset: VueUiWaffleDatasetItem[]
  }>
>(() => {
  return scanItems.value.map((scanItem) => ({
    config: {
      time: scanItem.date,
      userOptions: { show: false },
      useBlurOnHover: false,
      style: {
        chart: {
          backgroundColor: colors.value.bg,
          legend: { show: false },
          layout: {
            rect: {
              stroke: colors.value.bg,
              useGradient: false,
            },
          },
          tooltip: {
            backgroundColor: colors.value.bg,
            color: colors.value.text,
            borderColor: colors.value.border,
            backgroundOpacity: 70,
          },
        },
      },
    },
    dataset: scanItem.data,
  }))
})

function getTime(cfg: VueUiWaffleConfig & { time: string }) {
  return cfg.time
}
</script>

<template>
  <ClientOnly v-if="waffles.length">
    <div class="flex flex-row flex-wrap gap-1 justify-center">
      <div
        v-for="(waffle, i) in waffles"
        :key="i"
        class="w-[100px] sm:w-[200px] flex flex-col"
      >
        <span>{{ waffle.config.time }}</span>
        <VueUiWaffle
          :dataset="waffle?.dataset ?? []"
          :config="waffle?.config ?? {}"
        >
          <template #tooltip="{ datapoint, config }">
            <div class="text-xs flex flex-col">
              <div class="mb-1">
                <span>{{
                  getTime(config as VueUiWaffleConfig & { time: string })
                }}</span>
              </div>
              <div class="flex flex-row gap-1 items-center">
                <div
                  class="h-2 w-2 rounded-full"
                  :style="{ backgroundColor: datapoint.color }"
                />
                <span>{{ datapoint.name }}</span>
              </div>

              <div class="flex flex-row justify-between gap-2">
                <span>Count:</span>
                <div class="flex flex-row gap-1">
                  <span>{{ datapoint.value }}</span>
                  <span>({{ datapoint.proportion }}%)</span>
                </div>
              </div>
            </div>
          </template>
        </VueUiWaffle>
      </div>
    </div>
  </ClientOnly>
</template>
