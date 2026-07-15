<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
  type VueUiXySvgSlotProps,
  type VueUiXyTooltipSlotProps,
} from 'vue-data-ui/vue-ui-xy'
import { useTooltipPosition } from 'vue-data-ui/composables'
import { identityConfig } from '@unveil/identity'
import { usePreferredDark } from '@vueuse/core'

import('vue-data-ui/style.css')

const { data } = useEcosystemHealthCurrentWeek()
const dates = computed(() => data.value?.dates)

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)
const isDarkMode = usePreferredDark()

const suspiciousScoreBounds: ScoreBounds = [
  0,
  identityConfig.THRESHOLD_SUSPICIOUS,
]
const amberScoreBounds: ScoreBounds = [
  identityConfig.THRESHOLD_SUSPICIOUS,
  identityConfig.THRESHOLD_HUMAN,
]
const humanScoreBounds: ScoreBounds = [identityConfig.THRESHOLD_HUMAN, 100]

const scoreBounds = shallowRef<ScoreBounds>(suspiciousScoreBounds)

function areScoreBoundsEqual(a: ScoreBounds, b: ScoreBounds) {
  return a[0] === b[0] && a[1] === b[1]
}

function isScoreRangeSelected(range: ScoreBounds) {
  return areScoreBoundsEqual(scoreBounds.value, range)
}

function setScoreBounds(range: ScoreBounds) {
  if (areScoreBoundsEqual(scoreBounds.value, range)) {
    return
  }

  scoreBounds.value = range
}

const selectedRangeColor = computed(() => {
  if (isScoreRangeSelected(suspiciousScoreBounds)) {
    return colors.value.danger
  }
  if (isScoreRangeSelected(amberScoreBounds)) {
    return colors.value.amber
  }
  return colors.value.green
})

const MAX_SELECTION = 5
const DEFAULT_SELECTION = 1

type SparklineDatasetItem = VueUiXyDatasetItem & {
  hasData?: boolean
  details?: { eligiblePrs: number[]; closedPrs: number[] }
}

type RepoSelectorOption = {
  key: string
  owner: string
  repo: string
  hasData: boolean
  latestValue: string | null
}

type SparklineChart = SparklineDatasetItem[]

let cachedResultsSource: unknown
const rawSparklineCache = new Map<string, SparklineChart[]>()

function getScoreBoundsKey(bounds: ScoreBounds) {
  return `${bounds[0]}-${bounds[1]}`
}

const rawSparklines = computed<SparklineChart[]>(() => {
  const results = data.value?.results ?? []

  if (results !== cachedResultsSource) {
    cachedResultsSource = results
    rawSparklineCache.clear()
  }

  const cacheKey = getScoreBoundsKey(scoreBounds.value)
  const cachedValue = rawSparklineCache.get(cacheKey)

  if (cachedValue) {
    return cachedValue
  }

  const nextValue = getClosedPrPercentageEvolutionByRepo(
    results,
    scoreBounds.value,
  ) as SparklineChart[]

  rawSparklineCache.set(cacheKey, nextValue)
  return nextValue
})

const GREEN_HUE = 155 // starting at green so we have Nuxt with its color ^^

const repoPalette = Array.from(
  { length: MAX_SELECTION },
  (_, i) =>
    `oklch(72% 0.14 ${(GREEN_HUE + Math.round((i * 360) / MAX_SELECTION)) % 360})`,
)

function getRepoNameParts(name: string) {
  const [rawOwner, ...repoParts] = name.split('/')
  const owner = rawOwner ?? ''
  const repo = repoParts.join('/')

  return {
    owner: repo ? owner : '',
    repo: repo || owner || 'Unknown repository',
  }
}

function getLatestDatasetValue(entry?: SparklineDatasetItem) {
  const rawValue = Array.isArray(entry?.series) ? entry.series.at(-1) : null
  const value = Number(rawValue)

  return Number.isFinite(value) ? `${value.toFixed(0)}%` : null
}

const repoOptions = computed<RepoSelectorOption[]>(() => {
  return rawSparklines.value
    .map((chart, index) => {
      const entry = chart[0]
      const key = entry?.name ?? `repo-${index}`
      const { owner, repo } = getRepoNameParts(key)

      return {
        key,
        owner,
        repo,
        hasData: Boolean(entry?.hasData),
        latestValue: getLatestDatasetValue(entry),
      }
    })
    .filter((option) => option.key)
})

const selectedRepoNames = shallowRef<string[]>([])
const selectedRepoColors = shallowRef<Record<string, string>>({})

function getRepoPaletteColor(index: number): string {
  return repoPalette[index % repoPalette.length] ?? colors.value.textMuted!
}

function getNormalizedRepoColors(repoNames: string[]) {
  const usedColors = new Set<string>()
  const nextColors: Record<string, string> = {}

  for (const repoName of repoNames) {
    const existingColor = selectedRepoColors.value[repoName]
    const color =
      existingColor &&
      repoPalette.includes(existingColor) &&
      !usedColors.has(existingColor)
        ? existingColor
        : (repoPalette.find((paletteColor) => !usedColors.has(paletteColor)) ??
          getRepoPaletteColor(usedColors.size))

    nextColors[repoName] = color
    usedColors.add(color)
  }

  return nextColors
}

function areStringArraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

function areColorMapsEqual(
  a: Record<string, string>,
  b: Record<string, string>,
) {
  const aEntries = Object.entries(a)
  const bEntries = Object.entries(b)

  return (
    aEntries.length === bEntries.length &&
    aEntries.every(([key, value]) => b[key] === value)
  )
}

function setSelectedRepoNames(repoNames: string[]) {
  const nextColors = getNormalizedRepoColors(repoNames)

  if (!areStringArraysEqual(selectedRepoNames.value, repoNames)) {
    selectedRepoNames.value = repoNames
  }

  if (!areColorMapsEqual(selectedRepoColors.value, nextColors)) {
    selectedRepoColors.value = nextColors
  }
}

const selectedRepoColorMap = computed(
  () => new Map(Object.entries(selectedRepoColors.value)),
)
const selectedRepoNameSet = computed(() => new Set(selectedRepoNames.value))
const selectedRepoCount = computed(() => selectedRepoNames.value.length)
const selectionLimit = computed(() =>
  Math.min(MAX_SELECTION, repoOptions.value.length),
)
const isSelectionFull = computed(() => selectedRepoCount.value >= MAX_SELECTION)

watch(
  repoOptions,
  (options) => {
    if (!options.length) {
      setSelectedRepoNames([])
      return
    }

    const availableRepoNames = new Set(options.map((option) => option.key))
    const preservedSelection = selectedRepoNames.value.filter((name) =>
      availableRepoNames.has(name),
    )

    if (!preservedSelection.length) {
      setSelectedRepoNames(
        options
          .slice(0, Math.min(DEFAULT_SELECTION, MAX_SELECTION))
          .map((option) => option.key),
      )
      return
    }

    if (preservedSelection.length !== selectedRepoNames.value.length) {
      setSelectedRepoNames(preservedSelection)
      return
    }

    setSelectedRepoNames(preservedSelection)
  },
  { immediate: true },
)

function isRepoSelected(repoName: string) {
  return selectedRepoNameSet.value.has(repoName)
}

function canToggleRepo(repoName: string) {
  return isRepoSelected(repoName) || !isSelectionFull.value
}

function toggleRepo(repoName: string) {
  const isSelected = isRepoSelected(repoName)

  if (isSelected) {
    if (selectedRepoNames.value.length <= 1) {
      return
    }

    setSelectedRepoNames(
      selectedRepoNames.value.filter((name) => name !== repoName),
    )
    return
  }

  if (selectedRepoNames.value.length >= MAX_SELECTION) {
    return
  }

  setSelectedRepoNames([...selectedRepoNames.value, repoName])
}

function getRepoColor(repoName: string) {
  return selectedRepoColorMap.value.get(repoName)
}

function getRepoStyle(repoName: string) {
  const color = getRepoColor(repoName)

  return {
    '--repo-color': color ?? 'transparent',
    '--repo-selected-bg': color
      ? `color-mix(in oklab, ${color} 12%, transparent)`
      : 'transparent',
  } as Record<string, string>
}

const rawSparklineByRepoName = computed(() => {
  const map = new Map<string, SparklineChart>()

  for (const chart of rawSparklines.value) {
    const repoName = chart[0]?.name

    if (repoName) {
      map.set(repoName, chart)
    }
  }

  return map
})

const selectedRawSparklines = computed<SparklineChart[]>(() => {
  return selectedRepoNames.value.flatMap((repoName) => {
    const chart = rawSparklineByRepoName.value.get(repoName)
    return chart ? [chart] : []
  })
})

const sparklines = computed<SparklineChart[]>(() => {
  return selectedRawSparklines.value.map((dataset) => {
    const repoName = dataset[0]?.name
    const repoColor = repoName ? getRepoColor(repoName) : undefined

    return dataset.map((datapoint) => ({
      ...datapoint,
      color: repoColor ?? selectedRangeColor.value,
      dataLabels: false,
      suffix: '%',
      smooth: true,
    }))
  })
})

const dataset = computed<VueUiXyDatasetItem[]>(() => sparklines.value.flat())

const chartLineRef = useTemplateRef('chartLineRef')
const tooltipPositionLine = useTooltipPosition(chartLineRef)

const config = computed<VueUiXyConfig>(() => ({
  useCssAnimation: false,
  chart: {
    userOptions: { show: false },
    zoom: { show: false },
    legend: { show: false },
    backgroundColor: colors.value.bg,
    height: 350,
    padding: {
      right: 100,
      top: 80,
    },
    highlighter: {
      opacity: 5,
      useLine: true,
      lineDasharray: 0,
      color: colors.value.textMuted,
    },
    tooltip: {
      position: tooltipPositionLine.value,
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 30,
      offsetX: 42,
      offsetY: -(selectedRepoCount.value * 18),
    },
    grid: {
      position: 'start',
      stroke: 'transparent',
      labels: {
        show: false,
        yAxis: {
          scaleMin: 0,
          scaleMax: 100,
        },
        xAxisLabels: {
          show: false,
          values: dates.value,
          datetimeFormatter: {
            enable: true,
            useUTC: true,
            locale: 'en',
            options: {
              year: 'dd MMM',
              month: 'dd MMM',
              day: 'dd MMM',
              minute: 'dd MMM',
              second: 'dd MMM',
            },
          },
        },
      },
    },
  },
  line: {
    radius: 0,
    useGradient: false,
    dot: {
      useSerieColor: true,
      fill: selectedRangeColor.value,
      strokeWidth: 3,
      selectedRadius: 6,
    },
  },
}))

function drawLastDatapointLabel(svg: VueUiXySvgSlotProps['svg']) {
  return createLastDatapointLabelsSvg({
    series: Array.isArray(svg?.data) ? svg.data : [],
    drawingArea: svg.drawingArea,
    svgWidth: svg.width,
    fontSize: 20,
    labelOffset: 24,
    colors: {
      foreground: colors.value.text!,
      background: colors.value.bg!,
      fallbackSerieColor: colors.value.textMuted!,
    },
    formatValue: (value) =>
      Number.isFinite(value) ? `${value.toFixed(0)}%` : '-',
    isDarkMode: isDarkMode.value,
  })
}

type SvgSerieItem = {
  id?: string
  plots?: Array<{ x: number; y: number; value: number }>
}

function getLastPlot(serie: SvgSerieItem) {
  return Array.isArray(serie?.plots) ? serie.plots.at(-1) : null
}

function getLastPlotTransform(serie: SvgSerieItem) {
  const lastPlot = getLastPlot(serie)
  if (!lastPlot) {
    return ''
  }
  return `translate(${lastPlot.x}px, ${lastPlot.y}px)`
}

type XyAugmentedSeries = SparklineDatasetItem & {
  details: { eligiblePrs: number[]; closedPrs: number[] }
}

type TooltipRow = {
  key: string
  owner: string
  repo: string
  color: string
  value: string
  detail: string
}

function getTooltipRows(timeLabel: VueUiXyTooltipSlotProps['timeLabel']) {
  const { absoluteIndex: index } = timeLabel

  if (!Number.isInteger(index)) {
    return []
  }

  return dataset.value.map((datapoint, datasetIndex): TooltipRow => {
    const entry = datapoint as unknown as XyAugmentedSeries
    const repoName = entry.name ?? `repo-${datasetIndex}`
    const { owner, repo } = getRepoNameParts(repoName)
    const eligible = entry.details?.eligiblePrs?.[index]
    const closed = entry.details?.closedPrs?.[index]
    const value = Number(entry.series?.[index])
    const percentage =
      closed == null || eligible == null
        ? value
        : eligible === 0
          ? 100
          : Math.round((closed / eligible) * 100)

    return {
      key: repoName,
      owner: owner!,
      repo,
      color: getRepoColor(repoName) ?? colors.value.border ?? 'currentColor',
      value: Number.isFinite(percentage) ? `${percentage.toFixed(0)}%` : '-',
      detail:
        closed == null || eligible == null
          ? 'No data'
          : `${closed} / ${eligible}`,
    }
  })
}
</script>

<template>
  <section ref="rootEl">
    <!-- REPO SELECTOR -->
    <div
      class="mb-4 rounded-lg max-w-screen sm:max-w-[740px] min-w-0"
      role="group"
      aria-label="Repository selector"
    >
      <div class="mb-5">
        <h2 class="text-center">
          Evolution of pull request closure rates by repository for PRs in a
          given score range.
        </h2>
        <p class="text-sm text-gh-muted text-center">
          Closure rates are based on daily snapshots, not cumulative history, so
          counts may change from one day to the next.
        </p>
      </div>
      <div
        class="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
      >
        <div>
          <p class="m-0 text-sm font-semibold leading-tight">
            Featured repositories
          </p>
          <p class="m-0 text-xs text-gh-muted">
            {{ selectedRepoCount }} / {{ selectionLimit }} selected
          </p>
        </div>
        <p class="m-0 max-w-[260px] text-xs text-gh-muted sm:text-right">
          Pick up to {{ MAX_SELECTION }} repositories. At least one must stay
          selected.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="option in repoOptions"
          :key="option.key"
          type="button"
          class="flex min-h-8 items-center gap-2 rounded-md border px-2.5 py-1 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          :class="[
            isRepoSelected(option.key)
              ? 'border-[var(--repo-color)] bg-[var(--repo-selected-bg)] focus-visible:ring-[var(--repo-color)]'
              : 'border-gh-border hover:border-current/30 focus-visible:ring-current/20',
          ]"
          :aria-pressed="isRepoSelected(option.key)"
          :disabled="!canToggleRepo(option.key)"
          :style="getRepoStyle(option.key)"
          @click="toggleRepo(option.key)"
        >
          <span
            class="h-2.5 w-2.5 rounded-full border"
            :class="
              isRepoSelected(option.key)
                ? 'border-[var(--repo-color)] bg-[var(--repo-color)]'
                : 'border-gh-border bg-transparent'
            "
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 truncate font-medium leading-tight">
            <span class="text-gh-muted"> {{ option.owner }}/ </span>
            <span>{{ option.repo }}</span>
          </span>
          <span
            class="shrink-0 px-1.5 py-0.5 text-[11px] leading-none text-gh-muted tabular-nums"
          >
            <span v-if="option.hasData">{{ option.latestValue ?? '—' }}</span>
            <span v-else>No data</span>
          </span>
        </button>
      </div>
    </div>

    <div class="max-w-screen sm:max-w-[740px]">
      <!-- SCORE RANGE SELECTOR -->
      <div class="mb-4 mt-8 flex items-center justify-center gap-6">
        <label class="font-medium">Score range</label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            :checked="isScoreRangeSelected(suspiciousScoreBounds)"
            class="accent-red"
            @change="setScoreBounds(suspiciousScoreBounds)"
          />
          <span>0-{{ identityConfig.THRESHOLD_SUSPICIOUS }}</span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            :checked="isScoreRangeSelected(amberScoreBounds)"
            class="accent-amber"
            @change="setScoreBounds(amberScoreBounds)"
          />
          <span>
            {{ identityConfig.THRESHOLD_SUSPICIOUS }}-{{
              identityConfig.THRESHOLD_HUMAN
            }}
          </span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            :checked="isScoreRangeSelected(humanScoreBounds)"
            class="accent-green"
            @change="setScoreBounds(humanScoreBounds)"
          />
          <span>{{ identityConfig.THRESHOLD_HUMAN }}-100</span>
        </label>
      </div>

      <div class="min-w-0 max-w-[740px] overflow-hidden">
        <ClientOnly>
          <VueUiXy ref="chartLineRef" :dataset="dataset" :config="config">
            <template #svg="{ svg }">
              <!-- LAST VALUE LABEL -->
              <!-- eslint-disable-next-line vue/no-v-text-v-html-on-component, vue/no-v-html -->
              <g v-html="drawLastDatapointLabel(svg)" />

              <!-- LAST DATAPOINT CIRCLE -->
              <g
                v-for="serie in Array.isArray(svg?.data) ? svg.data : []"
                :key="serie.id"
                class="last-datapoint"
                :style="{ transform: getLastPlotTransform(serie) }"
              >
                <circle
                  class="value-plot"
                  cx="0"
                  cy="0"
                  r="6"
                  :fill="serie.color"
                  :stroke="colors.bg"
                  stroke-width="3"
                />
              </g>
            </template>

            <!-- CUSTOM TOOLTIP -->
            <template #tooltip="{ timeLabel }">
              <div class="min-w-[220px] text-xs">
                <div class="mb-2 font-medium text-gh-muted">
                  {{ timeLabel.text }}
                </div>

                <div class="flex flex-col gap-1.5">
                  <div
                    v-for="row in getTooltipRows(timeLabel)"
                    :key="row.key"
                    class="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2"
                  >
                    <span
                      class="h-2 w-2 rounded-full"
                      :style="{ backgroundColor: row.color }"
                      aria-hidden="true"
                    />
                    <span class="min-w-0 truncate text-left">
                      <span class="text-gh-muted"> {{ row.owner }}/ </span>
                      <span>{{ row.repo }}</span>
                    </span>
                    <span class="text-gh-muted tabular-nums">
                      {{ row.detail }}
                    </span>
                    <span class="font-medium tabular-nums">
                      {{ row.value }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </VueUiXy>
        </ClientOnly>
      </div>
    </div>
  </section>
</template>

<style scoped>
:deep(.vue-data-ui-component path),
:deep(.last-datapoint),
:deep(.value-label),
:deep(.value-plot),
:deep(.vdui-shape-circle) {
  transition: none !important;
}
:deep(.vue-data-ui-component circle) {
  stroke: var(--bg);
}
</style>
