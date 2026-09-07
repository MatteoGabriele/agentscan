<script setup lang="ts">
import type { VueUiXySvgSlotProps } from 'vue-data-ui/vue-ui-xy'
import {
  PR_VOLUME_DASH_ARRAY,
  PR_VOLUME_STROKE_WIDTH,
} from '~~/shared/utils/charts.ts'

const props = withDefaults(
  defineProps<{
    svg: VueUiXySvgSlotProps['svg']
    counts: number[]
    color: string
    visible?: boolean
    strokeWidth?: number
  }>(),
  {
    visible: false,
    strokeWidth: PR_VOLUME_STROKE_WIDTH,
  },
)

// This is an arbitrary ratio to keep the line within a certain height
// Pretty much visual tweaking
const PEAK_HEIGHT_RATIO = 0.85

const points = computed(() => {
  const plots = props.svg.data?.[0]?.plots ?? []
  const sliceStart = props.svg.slicer?.start ?? 0
  const maxCount = props.counts.length ? Math.max(...props.counts) : 0

  if (plots.length < 2 || maxCount <= 0) {
    return ''
  }

  const { bottom, height } = props.svg.drawingArea

  return plots
    .map((plot, index) => {
      const count = props.counts[index + sliceStart] ?? 0
      const y = bottom - (count / maxCount) * height * PEAK_HEIGHT_RATIO
      return `${plot.x},${y}`
    })
    .join(' ')
})
</script>

<template>
  <polyline
    v-if="points"
    :points
    fill="none"
    :stroke="color"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :stroke-dasharray="PR_VOLUME_DASH_ARRAY"
    :opacity="visible ? 0.75 : 0"
    class="pr-volume-line"
  />
</template>

<style scoped>
.pr-volume-line {
  pointer-events: none;
  transition: opacity 250ms ease !important;
}
</style>
