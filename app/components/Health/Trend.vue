<script setup lang="ts">
import type { IdentityClassification } from '@unveil/identity'

const props = defineProps<{
  label: string
  percentage: string | undefined
  classification?: IdentityClassification
  trend?: number
}>()

// @todo: should be globally available to avoid repetition and inconsistencies
const color = computed(() => {
  if (props.classification === 'organic') {
    return 'bg-ui-organic'
  } else if (props.classification === 'automation') {
    return 'bg-ui-automation'
  } else if (props.classification === 'mixed') {
    return 'bg-ui-mixed'
  } else {
    return 'bg-ui-muted'
  }
})

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

      <span class="text-ui-muted ml-1"> {{ percentage }}% </span>

      <span v-if="classification" :class="trendColor">
        <span :class="trendIcon" class="shrink-0 align-middle" />
        {{ trendLabel }}
      </span>
    </p>
  </div>
</template>
