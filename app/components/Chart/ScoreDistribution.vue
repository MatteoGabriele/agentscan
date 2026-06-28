<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { VueUiXy, type VueUiXyConfig, type VueUiXyDatasetItem } from 'vue-data-ui/vue-ui-xy'
import { round } from '~~/shared/utils/numbers'

import('vue-data-ui/style.css')

const props = defineProps<{
  data: EcosystemHealthItem[] | undefined
}>()

type ScoreDistributionRange = {
  label: string
  start: number
  end: number
  color: string
}

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)

const uniqueEntries = computed(() => {
  if (!props.data) {
    return []
  }

  return [...new Map(props.data.map((item) => [`${item.repo_name}#${item.pr_key}`, item])).values()]
})

function isBetween({ value, start, end }: { value: number; start: number; end: number }) {
  return value >= start && value <= end
}

const colorRange = computed(() => {
  return [colors.value.red!, colors.value.amber!, colors.value.green!]
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

function distribute(entries: EcosystemHealthItem[]) {
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

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  chart: {
    userOptions: { show: false },
    zoom: { show: false },
    height: 350,
    padding: {
      top: 24,
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
              .map((d) => `${space(8)}${d.name.replace('0-', `${space(5)} 0-`)}${space(10)}`)
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
</script>

<template>
  <div class="mb-5">
    <h2 class="text-center">Overall PR score distribution</h2>
  </div>
  <ClientOnly>
    <VueUiXy :dataset :config />
  </ClientOnly>
</template>
