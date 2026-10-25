<script setup lang="ts">
import type { IdentityClassification } from '@unveil/identity'
import type { ActivityUnit } from '~~/shared/types/activity'
import { formatCompactNumber } from '~~/shared/utils/numbers'
import { SWATCH } from '~~/shared/utils/charts'

const props = defineProps<{
  label: string
  percentage: string | undefined
  count?: number
  unit?: ActivityUnit
  classification?: IdentityClassification
  trend?: number
}>()

const displayValue = computed(() =>
  props.unit === 'quantity'
    ? props.count == null
      ? undefined
      : formatCompactNumber(props.count)
    : props.percentage == null
      ? undefined
      : `${props.percentage}%`,
)

const color = computed(() =>
  props.classification && props.classification !== 'insufficient-data'
    ? SWATCH[props.classification]
    : 'bg-ui-muted',
)

const trendColor = computed(() => {
  return getTrendColor({
    value: props.trend,
    reversed: props.classification !== 'organic',
  })
})

const trendIcon = computed(() => getTrendArrow(props.trend))
const trendLabel = computed(() => formatTrend(props.trend))
</script>

<template>
  <div class="flex gap-2 items-center flex-1 justify-center">
    <span :class="`size-2 ${color} block rounded-full`"></span>

    <p class="text-sm">
      {{ label }}

      <template v-if="displayValue !== undefined">
        <span class="text-ui-muted ml-1"> {{ displayValue }} </span>

        <span v-if="classification" class="ml-1" :class="trendColor">
          <span :class="trendIcon" class="shrink-0 align-middle" />
          {{ trendLabel }}
        </span>
      </template>

      <Skeleton
        v-else
        class="ml-1 inline-block align-middle"
        width="w-[92px]"
        height="h-[14px]"
        rounded="full"
      />
    </p>
  </div>
</template>
