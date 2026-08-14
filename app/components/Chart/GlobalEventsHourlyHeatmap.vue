<script setup lang="ts">
import {
  VueUiHeatmap,
  type VueUiHeatmapConfig,
  type VueUiHeatmapDatapoint,
  type VueUiHeatmapDatasetItem,
} from 'vue-data-ui/vue-ui-heatmap'
import { useEventListener, useResizeObserver, useTimeout } from '@vueuse/core'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { mergeConfigs } from 'vue-data-ui/utils'
import { round } from '~~/shared/utils/numbers'

import('vue-data-ui/style.css')

dayjs.extend(utc)

type EcosystemHealthCategory = 'organic' | 'mixed' | 'automation'

type EcosystemHealthHourlySeries = {
  count: number
  trend: number
  percentage: number
}

type EcosystemHealthHourly = {
  scanTimes: string[]
  countsByScanTime: Record<
    string,
    {
      organic?: EcosystemHealthHourlySeries
      mixed?: EcosystemHealthHourlySeries
      automation?: EcosystemHealthHourlySeries
      total?: EcosystemHealthHourlySeries
      createdAt: string
    }
  >
}

const SELECTION_BORDER = 2
const SELECTION_RADIUS = 1

const { data } = await useEcosystemHealthHourly()

const rootEl = shallowRef<HTMLElement | null>(null)
const componentEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)
const activeCellEl = shallowRef<SVGRectElement | null>(null)

const ready = shallowRef(false)

useTimeout(300, {
  callback: () => (ready.value = true),
})

let selectionOverlayEl: HTMLDivElement | null = null
let animationFrameId: number | null = null

const scanTimes = computed(() => data.value?.scanTimes ?? [])

const hourLabels = computed(() => {
  return scanTimes.value.map((timestamp) =>
    dayjs.utc(timestamp).format('HH:mm'),
  )
})

const heatmapSeries = computed(
  (): Array<{
    key: EcosystemHealthCategory
    name: string
    color: string
  }> => [
    {
      key: 'organic',
      name: 'Organic',
      color: colors.value.greenLine!,
    },
    {
      key: 'mixed',
      name: 'Mixed',
      color: colors.value.amber!,
    },
    {
      key: 'automation',
      name: 'Automation',
      color: colors.value.dangerHover!,
    },
  ],
)

function createHeatmapDataset(
  ecosystemHealth: EcosystemHealthHourly,
  category: EcosystemHealthCategory,
): VueUiHeatmapDatasetItem[] {
  return [
    {
      name: '',
      values: ecosystemHealth.scanTimes.map(
        (scanTime) =>
          ecosystemHealth.countsByScanTime[scanTime]?.[category]?.percentage ??
          0,
      ),
    },
  ]
}

const numberOfPoints = computed(() => scanTimes.value.length)

const baseConfig = computed<VueUiHeatmapConfig>(() => ({
  userOptions: {
    show: false,
  },
  events: {
    datapointEnter: ({ datapoint }: { datapoint: VueUiHeatmapDatapoint }) => {
      handleDatapointEnter(datapoint)
    },
    datapointLeave: () => {
      hideSelectionOverlay()
    },
  },
  style: {
    backgroundColor: colors.value.bg,
    color: colors.value.textMuted,
    layout: {
      width: numberOfPoints.value * 32,
      height: 64,
      cells: {
        spacing: 0,
        colors: {
          cold: colors.value.bg,
        },
        selected: {
          border: SELECTION_BORDER,
          color: colors.value.text,
        },
        value: {
          show: false,
        },
      },
      dataLabels: {
        xAxis: {
          show: true,
          color: colors.value.textMuted,
          values: hourLabels.value,
        },
        yAxis: {
          show: false,
          color: colors.value.textMuted,
        },
      },
    },
    legend: {
      show: false,
    },
    tooltip: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 70,
    },
  },
}))

function createHeatmapConfig(
  hotColor: string,
  index: number,
): VueUiHeatmapConfig {
  return mergeConfigs({
    defaultConfig: baseConfig.value,

    userConfig: {
      style: {
        backgroundColor: 'transparent',
        layout: {
          height: index === 0 ? 60 : 32,
          cells: {
            spacing: 0,
            colors: {
              hot: hotColor,
            },
          },
          dataLabels: {
            xAxis: {
              show: index === 0,
            },
          },
          padding: {
            top: index === 0 ? 0 : -24,
            bottom: -6,
          },
        },
      },
    },
  })
}

const heatmaps = computed(() => {
  return heatmapSeries.value.map((seriesItem, index) => ({
    name: seriesItem.name,
    color: seriesItem.color,
    dataset: data.value
      ? createHeatmapDataset(
          data.value as EcosystemHealthHourly,
          seriesItem.key,
        )
      : [],
    config: createHeatmapConfig(seriesItem.color, index),
  }))
})

function getHourFromHeatmapCell(datapoint: VueUiHeatmapDatapoint): string {
  return datapoint?.xAxisName ?? ''
}

function svgToClientCoords(x: number, y: number, svgEl: SVGSVGElement | null) {
  if (!svgEl) {
    return null
  }

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  const matrix = svgEl.getScreenCTM()

  if (matrix) {
    const point = svgEl.createSVGPoint()
    point.x = x
    point.y = y

    const result = point.matrixTransform(matrix)

    if (!Number.isFinite(result.x) || !Number.isFinite(result.y)) {
      return null
    }

    return {
      x: result.x,
      y: result.y,
    }
  }

  const clientRect = svgEl.getBoundingClientRect()
  const viewBox = svgEl.viewBox.baseVal

  if (viewBox.width && viewBox.height) {
    return {
      x: clientRect.left + ((x - viewBox.x) / viewBox.width) * clientRect.width,
      y:
        clientRect.top + ((y - viewBox.y) / viewBox.height) * clientRect.height,
    }
  }

  return {
    x: clientRect.left + x,
    y: clientRect.top + y,
  }
}

function getSvgScale(svgEl: SVGSVGElement) {
  const matrix = svgEl.getScreenCTM()

  if (!matrix) {
    return {
      x: 1,
      y: 1,
    }
  }

  return {
    x: Math.hypot(matrix.a, matrix.b),
    y: Math.hypot(matrix.c, matrix.d),
  }
}

function handleDatapointEnter(datapoint: VueUiHeatmapDatapoint) {
  if (!datapoint.id) {
    hideSelectionOverlay()
    return
  }

  const cellEl = componentEl.value?.querySelector<SVGRectElement>(
    `rect[data-a11y-cell-id="${datapoint.id}"]`,
  )

  if (!cellEl) {
    hideSelectionOverlay()
    return
  }

  activeCellEl.value = cellEl
  updateSelectionOverlay()
}

function updateSelectionOverlay() {
  const cellEl = activeCellEl.value

  if (!cellEl || !cellEl.isConnected || !selectionOverlayEl) {
    hideSelectionOverlay()
    return
  }

  const svgEl = cellEl.ownerSVGElement

  if (!svgEl) {
    hideSelectionOverlay()
    return
  }

  const bbox = cellEl.getBBox()

  const selectionLeft = bbox.x - SELECTION_BORDER
  const selectionTop = bbox.y - SELECTION_BORDER
  const selectionRight = bbox.x + bbox.width + SELECTION_BORDER
  const selectionBottom = bbox.y + bbox.height + SELECTION_BORDER
  const topLeft = svgToClientCoords(selectionLeft, selectionTop, svgEl)
  const topRight = svgToClientCoords(selectionRight, selectionTop, svgEl)
  const bottomLeft = svgToClientCoords(selectionLeft, selectionBottom, svgEl)
  const bottomRight = svgToClientCoords(selectionRight, selectionBottom, svgEl)

  if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
    hideSelectionOverlay()
    return
  }

  const left = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)
  const right = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x)
  const top = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)
  const bottom = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y)
  const scale = getSvgScale(svgEl)
  const strokeWidth = SELECTION_BORDER * ((scale.x + scale.y) / 2)
  const borderRadius = SELECTION_RADIUS * ((scale.x + scale.y) / 2)
  const offset = right - left - (bottom - top)

  Object.assign(selectionOverlayEl.style, {
    display: 'block',
    left: `${left}px`,
    top: `${top - offset}px`,
    width: `${right - left}px`,
    height: `${right - left}px`,
    border: `${strokeWidth}px solid ${colors.value.text}`,
    borderRadius: `${borderRadius}px`,
  })
}

function scheduleSelectionOverlayUpdate() {
  if (!activeCellEl.value) {
    return
  }

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }

  animationFrameId = requestAnimationFrame(() => {
    animationFrameId = null
    updateSelectionOverlay()
  })
}

function hideSelectionOverlay() {
  activeCellEl.value = null

  if (selectionOverlayEl) {
    selectionOverlayEl.style.display = 'none'
  }

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

/**
 * Since we are 'abusing' VueUiHeatmap by stacking 3 instances without
 * spacing, the native SVG selection rect gets cropped, so we have to re-create that selection outside the chart and position it in the client space.
 */
onMounted(() => {
  rootEl.value = document.documentElement

  selectionOverlayEl = document.createElement('div')

  selectionOverlayEl.setAttribute('data-global-events-heatmap-selection', '')

  Object.assign(selectionOverlayEl.style, {
    position: 'fixed',
    display: 'none',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    background: 'transparent',
    zIndex: '2147483647',
  })

  document.body.appendChild(selectionOverlayEl)
})

useEventListener('resize', scheduleSelectionOverlayUpdate)
useEventListener('scroll', scheduleSelectionOverlayUpdate, {
  capture: true,
})

useResizeObserver(componentEl, scheduleSelectionOverlayUpdate)

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
  }
  selectionOverlayEl?.remove()
  selectionOverlayEl = null
})
</script>

<template>
  <div
    ref="componentEl"
    class="flex w-full flex-col transition-opacity"
    :style="{
      opacity: ready ? 1 : 0,
    }"
  >
    <div class="mb-5">
      <h2 class="text-center">Hourly ecosystem health heatmap</h2>
    </div>
    <ClientOnly>
      <div
        v-for="heatmap in heatmaps"
        :key="heatmap.name"
        class="heatmap w-full overflow-x-auto"
      >
        <VueUiHeatmap :dataset="heatmap.dataset" :config="heatmap.config">
          <template #tooltip="{ datapoint }">
            <div class="mb-1" :style="{ color: colors.textMuted }">
              {{ getHourFromHeatmapCell(datapoint) }}
            </div>

            <div class="flex flex-row items-center gap-2">
              <div class="h-2 w-2">
                <svg viewBox="0 0 2 2" class="h-full w-full">
                  <circle cx="1" cy="1" r="1" :fill="heatmap.color" />
                </svg>
              </div>

              <span>
                {{ heatmap.name }}
              </span>

              <span :style="{ color: colors.textMuted }">
                {{ round(datapoint.value ?? 0, 1) + '%' }}
              </span>
            </div>
          </template>
        </VueUiHeatmap>
      </div>
    </ClientOnly>
  </div>
</template>

<style scoped>
:deep(rect) {
  shape-rendering: crispEdges !important;
}

/** Hide the native selector because it is required as a target to create the custom overlay */
:deep(rect[data-cy='cell-selected']) {
  opacity: 0 !important;
}
</style>
