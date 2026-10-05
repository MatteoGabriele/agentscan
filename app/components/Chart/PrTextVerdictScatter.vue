<script setup lang="ts">
// NOTE: the name of this component is a bit crappy. Feel free to find a better one^^
import { computed, nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
import {
  VueUiScatter,
  type VueUiScatterConfig,
  type VueUiScatterDatasetItem,
} from 'vue-data-ui/vue-ui-scatter'
import ClassificationToggle from '../Activity/ClassificationToggle.vue'
import type { ActivityCategory } from '~~/shared/types/activity'
import type { VueUiScatterEmitSelectLegend } from 'vue-data-ui'

import('vue-data-ui/style.css')

const { data: hourlyWindow } = await useActivityHourlyWindow()

const source = computed(() =>
  // Note for the future: we can also add a toggle to filter out by text_template_found
  hourlyWindow.value?.results.filter(
    (result) =>
      'text_confidence' in result &&
      'text_probability' in result &&
      result.score !== -1,
  ),
)

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)

onMounted(() => {
  rootEl.value = document.documentElement
})

type ChartDefinition = {
  classification: ActivityCategory
  label: string
  scoreStart: number
  scoreEnd: number
  xMin: number
  xMax: number
}

const chartDefinitions: ChartDefinition[] = [
  {
    classification: 'organic',
    label: 'Organic',
    scoreStart: 70,
    scoreEnd: 100,
    xMin: 70,
    xMax: 100,
  },
  {
    classification: 'mixed',
    label: 'Mixed',
    scoreStart: 50,
    scoreEnd: 70,
    xMin: 50,
    xMax: 70,
  },
  {
    classification: 'automation',
    label: 'Automation',
    scoreStart: 0,
    scoreEnd: 50,
    xMin: 0,
    xMax: 50,
  },
]

function getScoreClassification(score: number): ActivityCategory {
  if (score < 50) {
    return 'automation'
  }
  if (score < 70) {
    return 'mixed'
  }
  return 'organic'
}

function getTextStrength(confidence: number, probability: number) {
  const normalizedConfidence = Math.max(0, Math.min(1, confidence))
  const normalizedProbability = Math.max(0, Math.min(1, probability))
  const probabilityCertainty = Math.abs(normalizedProbability - 0.5) * 2

  return Math.sqrt(normalizedConfidence * probabilityCertainty)
}

const classifiedSource = computed(() => {
  const result: Record<ActivityCategory, NonNullable<typeof source.value>> = {
    automation: [],
    mixed: [],
    organic: [],
  }

  for (const item of source.value ?? []) {
    const classification = getScoreClassification(item.score ?? 0)
    result[classification].push(item)
  }

  return result
})

function getDataset(
  classification: ActivityCategory,
): VueUiScatterDatasetItem[] {
  const items = classifiedSource.value[classification]

  const mapItem = (item: (typeof items)[number]) => ({
    ...item,
    x: item.score ?? 0,
    y:
      getTextStrength(item.text_confidence ?? 0, item.text_probability ?? 0.5) *
      100,
    name: `${item.pr} - ${item.repo_name}`,
    classification,
  })

  return [
    {
      name: 'human',
      color: colors.value.organic,
      shape: 'circle',
      values: items
        .filter((item) => item.text_verdict === 'human')
        .map(mapItem),
    },
    {
      name: 'ai',
      color: colors.value.automation,
      shape: 'square',
      values: items.filter((item) => item.text_verdict === 'ai').map(mapItem),
    },
  ]
}

function getConfig(definition: ChartDefinition): VueUiScatterConfig {
  return {
    usePerformanceMode: true,
    userOptions: {
      show: false,
    },

    events: {
      datapointClick: ({ datapoint }) => {
        const { repo_name, pr } = datapoint.v
        if (!repo_name || !pr) {
          return
        }
        const url = `https://github.com/${repo_name}/pull/${pr}`
        window.open(url, '_blank', 'noopener,noreferrer')
      },
    },

    style: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,

      layout: {
        height: 366,
        width: 400,
        padding: {
          top: 0,
          bottom: 36,
          right: 36,
          left: 36,
        },

        dataLabels: {
          xAxis: {
            show: false,
          },
          yAxis: {
            show: false,
          },
        },

        axis: {
          stroke: colors.value.border,
          strokeWidth: 0.5,
          xMin: definition.xMin,
          xMax: definition.xMax,
          yMin: 0,
          yMax: 100,
        },

        correlation: {
          show: false,
        },

        plots: {
          radius: 3,
          selectors: { show: false },
          significance: {
            show: false,
          },
          stroke: colors.value.bg,
        },
      },

      legend: {
        position: 'top',
        color: colors.value.textMuted,
        backgroundColor: colors.value.bg,
      },

      tooltip: {
        showShape: false,
        backgroundColor: colors.value.bg,
        color: colors.value.text,
        borderColor: colors.value.border,
        backgroundOpacity: 70,
      },
    },
  }
}

const charts = computed(() =>
  chartDefinitions.map((definition) => ({
    ...definition,
    dataset: getDataset(definition.classification),
    config: getConfig(definition),
  })),
)

const selectedClassification = ref<ActivityCategory>('organic')

const selectedChart = computed(() =>
  charts.value.find(
    (chart) => chart.classification === selectedClassification.value,
  ),
)

const chartRef = useTemplateRef('chartRef')
const selectedLegendItem = ref<string | null>(null)

function selectLegend(visibleSeries: VueUiScatterEmitSelectLegend) {
  selectedLegendItem.value =
    visibleSeries.length === 1 ? (visibleSeries[0]?.name ?? null) : null
}

// Legend filtering is persisted through chart instances
async function applySelectedLegend() {
  const selectedItem = selectedLegendItem.value

  if (!selectedItem) {
    return
  }

  await nextTick()

  const chart = chartRef.value
  if (!chart) {
    return
  }

  chart.showSeries(selectedItem)

  for (const series of ['human', 'ai']) {
    if (series !== selectedItem) {
      chart.hideSeries(series)
    }
  }
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h2 class="text-center">PR descriptions analysis</h2>

      <p class="text-sm text-ui-muted text-center">
        Correlation between account scores and the estimated automation of PR
        descriptions.
      </p>
    </div>
    <div class="flex justify-center mb-4">
      <ClassificationToggle v-model="selectedClassification" />
    </div>
    <ClientOnly>
      <div v-if="selectedChart">
        <VueUiScatter
          :key="selectedChart.classification"
          ref="chartRef"
          :dataset="selectedChart.dataset"
          :config="selectedChart.config"
          @vue:mounted="applySelectedLegend"
          @select-legend="selectLegend"
        >
          <template #svg="{ svg }">
            <text
              :transform="`translate(${svg.drawingArea.left - 10},${svg.drawingArea.top + svg.drawingArea.height / 2}) rotate(-90)`"
              font-size="8"
              :fill="colors.textMuted"
              text-anchor="middle"
            >
              Text verdict strength
            </text>

            <text
              :x="svg.drawingArea.left + svg.drawingArea.width / 2"
              :y="svg.drawingArea.bottom + 14"
              font-size="8"
              :fill="colors.textMuted"
              text-anchor="middle"
            >
              Score
            </text>

            <text
              :x="svg.drawingArea.left - 6"
              :y="svg.drawingArea.top"
              font-size="8"
              :fill="colors.textMuted"
              text-anchor="end"
              dominant-baseline="middle"
            >
              100
            </text>

            <text
              :x="svg.drawingArea.left - 6"
              :y="svg.drawingArea.bottom"
              font-size="8"
              :fill="colors.textMuted"
              text-anchor="end"
              dominant-baseline="middle"
            >
              0
            </text>

            <text
              :x="svg.drawingArea.left"
              :y="svg.drawingArea.bottom + 12"
              font-size="8"
              :fill="colors.textMuted"
              text-anchor="middle"
            >
              {{ selectedChart.scoreStart }}
            </text>

            <text
              :x="svg.drawingArea.right"
              :y="svg.drawingArea.bottom + 12"
              font-size="8"
              :fill="colors.textMuted"
              text-anchor="middle"
            >
              {{ selectedChart.scoreEnd }}
            </text>
          </template>

          <template #tooltip="{ datapoint }">
            <!-- Just threw that in here, the layout can be improved -->
            <div>
              <div
                class="border-b border-ui-border pb-2 text-xs text-ui-muted flex gap-1 items-center"
              >
                <span
                  class="i-lucide:external-link text-ui-muted opacity-60 shrink-0"
                />
                Click to open the PR in a new tab
              </div>
              <div class="mt-2">
                <span class="text-ui-muted">Classification: </span
                >{{ datapoint.v.classification }}
              </div>
              <div>
                <span class="text-ui-muted">PR: </span>#{{ datapoint.v.pr }}
              </div>
              <div>
                <span class="text-ui-muted">Repo: </span>
                {{ datapoint.v.repo_name }}
              </div>
              <div>
                <span class="text-ui-muted">Score: </span
                >{{ datapoint.v.score }}
              </div>
              <div>
                <span class="text-ui-muted">Text verdict strength: </span
                >{{ Math.round(datapoint.v.y) }}%
              </div>
              <div>
                <span class="text-ui-muted">Text verdict: </span
                >{{ datapoint.v.text_verdict }}
              </div>
            </div>
          </template>

          <template #legend="{ legend }">
            <div class="flex flex-row gap-4 justify-center mt-2">
              <button
                v-for="item in legend"
                :key="item.id"
                class="flex flex-row gap-1.5 place-items-center"
                :class="item.isSegregated ? 'opacity-50' : 'hover:underline'"
                @click="item.segregate()"
              >
                <div class="w-2 h-2">
                  <svg viewBox="0 0 2 2" class="w-full h-full">
                    <circle
                      v-if="item.shape === 'circle'"
                      :cx="1"
                      :cy="1"
                      :r="1"
                      :fill="item.color"
                    />
                    <rect
                      v-else-if="item.shape === 'square'"
                      :x="0"
                      :y="0"
                      :width="2"
                      :height="2"
                      :fill="item.color"
                    />
                  </svg>
                </div>
                <div
                  :class="`text-sm ${item.isSegregated ? 'line-through' : ''}`"
                >
                  {{ item.name }}
                </div>
              </button>
            </div>
          </template>
        </VueUiScatter>
      </div>
    </ClientOnly>
  </div>
</template>
