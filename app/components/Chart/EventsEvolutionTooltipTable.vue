<script setup lang="ts">
import type { VueUiXyTooltipSlotProps } from 'vue-data-ui/vue-ui-xy'
import type { VueUiXyDatasetItemWithTrends } from '~~/shared/types/activity'
import { formatProgressionPoints } from '~~/shared/utils/activity-stats'
import {
  PR_VOLUME_DASH_ARRAY,
  PR_VOLUME_STROKE_WIDTH,
} from '~~/shared/utils/charts.ts'
import { round } from '~~/shared/utils/numbers'

const props = defineProps<{
  tooltipSlotProps: Pick<
    VueUiXyTooltipSlotProps,
    'datapoint' | 'timeLabel' | 'series'
  >
  colors: Record<string, string>
  canCompare?: boolean
  rawDataset: VueUiXyDatasetItemWithTrends[]
  prCounts: number[]
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

const prCount = computed(
  () => props.prCounts[props.tooltipSlotProps.timeLabel.absoluteIndex] ?? null,
)

const prCountDelta = computed(() => {
  const index = props.tooltipSlotProps.timeLabel.absoluteIndex
  const current = props.prCounts[index]
  const previous = props.prCounts[index - 1]

  if (typeof current !== 'number' || typeof previous !== 'number') {
    return null
  }

  const delta = current - previous

  return `${delta > 0 ? '+' : ''}${delta}`
})
</script>

<template>
  <table class="text-left">
    <thead class="text-left text-xs">
      <tr class="text-ui-muted">
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
            <div class="h-2 w-3.5 shrink-0 flex items-center">
              <svg viewBox="0 0 2 2" class="h-2 w-2">
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
          <td class="px-2 text-right border-l border-solid border-ui-border">
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

          <td class="px-2 text-left border-l border-solid border-ui-border">
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

      <tr v-if="prCount !== null" class="text-ui-muted">
        <td class="pr-2 pt-1">
          <div class="flex flex-row gap-2 place-items-center">
            <div class="h-2 w-3.5 shrink-0 flex items-center">
              <svg viewBox="0 0 14 2" class="h-[2px] w-3.5">
                <line
                  x1="1"
                  y1="1"
                  x2="13"
                  y2="1"
                  stroke="currentColor"
                  :stroke-width="PR_VOLUME_STROKE_WIDTH"
                  stroke-linecap="round"
                  :stroke-dasharray="PR_VOLUME_DASH_ARRAY"
                />
              </svg>
            </div>

            <span>Pull requests</span>
          </div>
        </td>

        <td class="px-2 pt-1 text-right">{{ prCount }}</td>

        <template v-if="canCompare">
          <td
            class="px-2 pt-1 text-right border-l border-solid border-ui-border"
          >
            {{ prCountDelta }}
          </td>
          <td
            class="px-2 pt-1 text-left border-l border-solid border-ui-border"
          />
        </template>
      </tr>
    </tbody>
  </table>
</template>
