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

const { data: hourlyWindow } = await useEcosystemHealthHourlyWindow()

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)

onMounted(() => {
  rootEl.value = document.documentElement
})

const scanItems = computed<
  Array<{ date: string; data: VueUiWaffleDatasetItem[]; totalCount: number }>
>(() => {
  const entries = Object.entries(
    hourlyWindow.value?.countsByScanTime ?? {},
  ).slice(-24) // removing the first one so we have an even number of hours

  return entries.map(([date, item]) => {
    const countOrganic = item.organic?.count ?? 0
    const countMixed = item.mixed?.count ?? 0
    const countAutomation = item.automation?.count ?? 0
    const totalCount = countOrganic + countMixed + countAutomation

    return {
      date: dayjs.utc(date).format('HH:mm'),
      data: [
        {
          name: 'Organic',
          values: [countOrganic],
          color: colors.value.organic,
        },
        {
          name: 'Mixed',
          values: [countMixed],
          color: colors.value.mixed,
        },
        {
          name: 'Automation',
          values: [countAutomation],
          color: colors.value.automation,
        },
      ],
      totalCount,
    }
  })
})

const waffles = computed<
  Array<{
    config: VueUiWaffleConfig & { time: string }
    dataset: VueUiWaffleDatasetItem[]
    totalCount: number
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
    totalCount: scanItem.totalCount,
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
        <div class="flex flex-row gap-1 text-xs mt-2 mb-1">
          <span>{{ waffle.config.time }}</span>
          <span>•</span>
          <span>{{ waffle.totalCount }} PRs</span>
        </div>
        <VueUiWaffle
          :dataset="waffle?.dataset ?? []"
          :config="waffle?.config ?? {}"
        >
          <template #tooltip="{ datapoint, config }">
            <div class="text-xs flex flex-col">
              <div class="mb-1 flex flex-row gap-2">
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
