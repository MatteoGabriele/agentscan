<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'

type ChartRange = 'daily' | 'hourly'
type ChartRangeOption = {
  value: ChartRange
  label: string
  caption: string
}

const isMobile = useIsMobile()

const rangeOptions = computed<ChartRangeOption[]>(() => [
  {
    value: 'daily',
    label: 'Daily',
    caption: `Daily totals from the last ${isMobile.value ? 2 : DEFAULT_HISTORY_MONTHS} ${isMobile.value ? 'weeks' : 'months'}`,
  },
  {
    value: 'hourly',
    label: 'Hourly',
    // In mobile we actually show 13 datapoints, but saying 12 looks better on the UI
    caption: `Last ${isMobile.value ? 12 : WINDOW_MAX_HOURS} hours, updated every hour`,
  },
])

const range = useLocalStorage<ChartRange>('daily-range', 'daily', {
  initOnMounted: true,
})
</script>

<template>
  <ClientOnly>
    <Toggle v-model="range" :options="rangeOptions" />

    <template #fallback>
      <Skeleton
        class="mb-1"
        width="w-[122px]"
        height="h-[26px]"
        rounded="full"
      />
      <Skeleton width="w-[192px]" height="h-[10px]" rounded="full" />
    </template>
  </ClientOnly>
</template>
