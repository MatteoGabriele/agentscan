<script setup lang="ts">
import { identityConfig } from '@unveil/identity'
import { useTimeout } from '@vueuse/core'
import { computed, shallowRef } from 'vue'
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
  type VueUiXySvgSlotProps,
} from 'vue-data-ui/vue-ui-xy'
import { round } from '~~/shared/utils/numbers'

import('vue-data-ui/style.css')

const { data: hourly } = useActivityHourlyWindow()

type ScoreDistributionRange = {
  label: string
  start: number
  end: number
  color: string
}

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)

const ready = shallowRef(false)

useTimeout(200, {
  callback: () => (ready.value = true),
})

const uniqueEntries = computed(() => {
  if (!hourly.value?.results) {
    return []
  }

  return [
    ...new Map(
      hourly.value.results.map((item) => [
        `${item.repo_name}#${item.pr_key}`,
        item,
      ]),
    ).values(),
  ]
})

function isBetween({
  value,
  start,
  end,
}: {
  value: number
  start: number
  end: number
}) {
  return value >= start && value <= end
}

const colorRange = computed(() => {
  return [colors.value.automation!, colors.value.mixed!, colors.value.organic!]
})

const scoreDistributionRanges = computed<ScoreDistributionRange[]>(() => {
  const bucketCount = 10
  const bucketSize = 10

  return Array.from({ length: bucketCount }, (_, index) => {
    const start = index === 0 ? 0 : index * bucketSize + 1
    const end = (index + 1) * bucketSize

    return {
      label: `${start}-${end}`,
      start,
      end,
      color: interpolateHexColors({
        colors: colorRange.value,
        ratio: index / (bucketCount - 1),
      }),
    }
  })
})

function distribute(entries: ActivityItem[]) {
  const result = Object.fromEntries(
    scoreDistributionRanges.value.map((range) => [range.label, 0]),
  ) as Record<string, number>

  entries.forEach((entry) => {
    const matchingRange = scoreDistributionRanges.value.find((range) =>
      isBetween({
        value: entry.score,
        start: range.start,
        end: range.end,
      }),
    )

    if (!matchingRange) {
      return
    }

    result[matchingRange.label] = (result[matchingRange.label] ?? 0) + 1
  })

  return result
}

const distributed = computed(() => distribute(uniqueEntries.value))

const dataset = computed<VueUiXyDatasetItem[]>(() => {
  return scoreDistributionRanges.value.map((range) => ({
    name: range.label,
    series: [distributed.value[range.label] ?? 0],
    type: 'bar',
    dataLabels: true,
    color: range.color,
  }))
})

const total = computed(() =>
  dataset.value
    .flatMap((n) => (n.series as number[]).map((n) => n))
    .reduce((a, b) => (a ?? 0) + (b ?? 0), 0),
)

const invisibleCharacter = '\u200E'

function space(n: number) {
  return Array.from({ length: n }, () => invisibleCharacter).join(' ')
}

const bottomPadding = 52

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  chart: {
    userOptions: { show: false },
    zoom: { show: false },
    height: 350,
    padding: {
      top: 24,
      bottom: bottomPadding,
    },
    labels: {
      fontSize: 16,
    },
    grid: {
      stroke: 'transparent',
      labels: {
        show: false,
        xAxisLabels: {
          show: true,
          color: colors.value.textMuted,
          values: [
            dataset.value
              .map(
                (d) =>
                  `${space(8)}${d.name.replace('0-', `${space(5)} 0-`)}${space(10)}`,
              )
              .join(' '),
          ],
        },
      },
    },
    legend: {
      show: false,
    },
    tooltip: {
      show: false,
    },
    highlighter: {
      opacity: 0,
    },
    backgroundColor: colors.value.bg,
  },
  bar: {
    periodGap: 0,
    useGradient: false,
    border: {
      strokeWidth: 1,
      stroke: colors.value.bg,
    },
    labels: {
      show: true,
      offsetY: -12,
      color: colors.value.text,
      formatter: ({ value }) => {
        if (!total.value) {
          return '0%'
        }
        return `${round((value / total.value) * 100, 1)}%`
      },
    },
  },
}))

function getClassificationAnnotations(svg: VueUiXySvgSlotProps['svg']) {
  const { left, width } = svg.drawingArea
  const padding = 6
  const x2Automation =
    left + (width * identityConfig.THRESHOLD_SUSPICIOUS) / 100
  const x2Mixed = left + (width * identityConfig.THRESHOLD_HUMAN) / 100

  const y = svg.height - bottomPadding
  return [
    {
      label: 'Automation',
      x1: left + padding,
      x2: x2Automation - padding,
      y,
      color: colors.value.automation,
      subtotal: svg.data
        .filter((_, i) => i <= 4)
        .map((d) => d.absoluteValues[0])
        .reduce((a, b) => (a ?? 0) + (b ?? 0), 0),
    },
    {
      label: 'Mixed',
      x1: x2Automation + padding,
      x2: x2Mixed - padding,
      y,
      color: colors.value.mixed,
      subtotal: svg.data
        .filter((_, i) => i > 4 && i <= 6)
        .map((d) => d.absoluteValues[0])
        .reduce((a, b) => (a ?? 0) + (b ?? 0), 0),
    },
    {
      label: 'Organic',
      x1: x2Mixed + padding,
      x2: svg.drawingArea.right - padding,
      y,
      color: colors.value.organic,
      subtotal: svg.data
        .filter((_, i) => i > 6)
        .map((d) => d.absoluteValues[0])
        .reduce((a, b) => (a ?? 0) + (b ?? 0), 0),
    },
  ].map((annotation) => {
    return {
      ...annotation,
      classificationProportion: (annotation.subtotal ?? 0) / (total.value ?? 1),
    }
  })
}
</script>

<template>
  <div
    class="transition-opacity"
    :style="{
      opacity: ready ? 1 : 0,
    }"
  >
    <div class="mb-5">
      <h2 class="text-center">Overall PR score distribution</h2>
      <p class="text-sm text-ui-muted text-center">
        For the 25 entries of the hourly window
      </p>
    </div>
    <ClientOnly>
      <VueUiXy :dataset :config>
        <template #svg="{ svg }">
          <g
            v-for="annotation in getClassificationAnnotations(svg)"
            :key="annotation.label"
          >
            <path
              :d="`M${annotation.x1 - 3},${annotation.y - 3} ${annotation.x1},${annotation.y} ${annotation.x2},${annotation.y} ${annotation.x2 + 3},${annotation.y - 3}`"
              :stroke="annotation.color"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <text
              :x="annotation.x1 + (annotation.x2 - annotation.x1) / 2"
              :y="svg.height - bottomPadding + 22"
              text-anchor="middle"
              font-size="16"
              :fill="colors.textMuted"
            >
              {{ annotation.label }}
            </text>
            <text
              :x="annotation.x1 + (annotation.x2 - annotation.x1) / 2"
              :y="svg.height"
              text-anchor="middle"
              font-size="24"
              :fill="colors.text"
            >
              {{ Math.round(annotation.classificationProportion * 100) }}%
            </text>
          </g>
        </template>
      </VueUiXy>
    </ClientOnly>
  </div>
</template>
