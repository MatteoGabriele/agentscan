<script setup lang="ts">
import type { VueUiXySvgSlotProps } from 'vue-data-ui/vue-ui-xy'
import { SVG_ICON } from '~~/shared/utils/charts'
import { CLASSIFICATION_CATEGORIES } from '~~/shared/utils/classifications'
import {
  formatHighShare,
  type HighShare,
  type HighShareCategory,
} from '~~/shared/utils/high-share'

const props = defineProps<{
  svg: VueUiXySvgSlotProps['svg']
  highShares: HighShare[][]
  colors: Record<string, string>
}>()

function getSeriesY(category: HighShareCategory, plotIndex: number) {
  const seriesIndex = CLASSIFICATION_CATEGORIES.indexOf(category)
  return props.svg.data?.[seriesIndex]?.plots?.[plotIndex]?.y
}

const markers = computed(() => {
  const plots = props.svg.data?.[0]?.plots ?? []
  const sliceStart = props.svg.slicer?.start ?? 0

  return plots.flatMap((plot, plotIndex) => {
    const highShares = props.highShares[plotIndex + sliceStart] ?? []

    return highShares.map((highShare) => ({
      ...highShare,
      x: plot.x,
      y: getSeriesY(highShare.category, plotIndex),
    }))
  })
})
</script>

<template>
  <template v-for="marker in markers" :key="`${marker.x}-${marker.category}`">
    <g
      v-if="marker.y !== undefined"
      :transform="`translate(${marker.x}, ${marker.y})`"
      :color="colors[marker.category]"
      class="hidden md:block"
      style="cursor: default"
    >
      <ChartSvgIcon
        :icon="SVG_ICON.circleDot"
        :title="formatHighShare(marker)"
        :background="colors.bg"
        :background-radius="7"
      />
    </g>
  </template>
</template>
