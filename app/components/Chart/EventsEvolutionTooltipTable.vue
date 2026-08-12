<script setup lang="ts">
import type { VueUiXyTooltipSlotProps } from 'vue-data-ui/vue-ui-xy'
import type { VueUiXyDatasetItemWithTrends } from '~~/shared/types/ecosystem-health'
import { formatProgressionPoints } from '~~/shared/utils/health-stats'
import { round } from '~~/shared/utils/numbers'

const props = defineProps<{
  tooltipSlotProps: Pick<
    VueUiXyTooltipSlotProps,
    'datapoint' | 'timeLabel' | 'series'
  >
  colors: Record<string, string>
  canCompare?: boolean
  rawDataset: VueUiXyDatasetItemWithTrends[]
}>()

type DatapointItem = {
  item: { slotAbsoluteIndex: number; name: string }
  index: number
}

function getTrend({ item, index }: DatapointItem) {
  const trend = props.rawDataset[item.slotAbsoluteIndex]?.trends[index]
  return {
    formattedValue: formatTrend(trend),
    color: getTrendColor({ value: trend, reversed: item.name !== 'Organic' }),
  }
}

function getProgressionVsPrevious({ item, index }: DatapointItem) {
  const valueCurrent = props.rawDataset[item.slotAbsoluteIndex]?.series[index]
  const valuePrevious =
    props.rawDataset[item.slotAbsoluteIndex]?.series[index - 1]
  let delta = 0
  if (typeof valueCurrent === 'number' && typeof valuePrevious === 'number') {
    delta = valueCurrent - valuePrevious
  }
  return {
    color: getTrendColor({ value: delta, reversed: item.name !== 'Organic' }),
    formattedValue: formatProgressionPoints(delta),
  }
}
</script>

<template>
  <table class="text-left">
    <thead class="text-left text-xs">
      <tr class="text-gh-muted">
        <th class="px-2 text-right"></th>
        <template v-if="canCompare">
          <th class="px-2 text-right"></th>
          <slot name="thead" />
        </template>
      </tr>
    </thead>

    <tbody>
      <tr
        v-for="dp in tooltipSlotProps.datapoint"
        :key="`${dp.name}-${dp.absoluteIndex}`"
      >
        <td class="pr-2">
          <div class="flex flex-row gap-2 place-items-center">
            <div class="h-2 w-2">
              <svg viewBox="0 0 2 2" class="h-full w-full">
                <circle cx="1" cy="1" r="1" :fill="dp.color" />
              </svg>
            </div>

            <span :style="{ color: colors.text }">
              {{ dp.name }}
            </span>
          </div>
        </td>

        <td class="px-2 text-right">
          <span :style="{ color: colors.text }">
            {{ round(dp.value ?? 0, 1) + '%' }}
          </span>
        </td>

        <template v-if="canCompare">
          <td class="px-2 text-right border-l border-solid border-gh-border">
            <template v-if="canCompare">
              <span
                :class="[
                  getProgressionVsPrevious({
                    item: dp,
                    index: tooltipSlotProps.timeLabel.absoluteIndex,
                  }).color,
                ]"
              >
                {{
                  getProgressionVsPrevious({
                    item: dp,
                    index: tooltipSlotProps.timeLabel.absoluteIndex,
                  }).formattedValue
                }}
              </span>
            </template>
          </td>

          <td class="px-2 text-left border-l border-solid border-gh-border">
            <template v-if="tooltipSlotProps.timeLabel.absoluteIndex > 0">
              <span
                :class="[
                  getTrend({
                    item: dp,
                    index: tooltipSlotProps.timeLabel.absoluteIndex,
                  }).color,
                ]"
              >
                {{
                  getTrend({
                    item: dp,
                    index: tooltipSlotProps.timeLabel.absoluteIndex,
                  }).formattedValue
                }}
              </span>
            </template>
          </td>
        </template>
      </tr>
    </tbody>
  </table>
</template>
