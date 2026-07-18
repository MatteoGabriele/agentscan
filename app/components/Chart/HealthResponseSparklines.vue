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

const { data } = useEcosystemHealth()
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
    return colors.value.red
  }
  if (isScoreRangeSelected(amberScoreBounds)) {
    return colors.value.amber
  }
  return colors.value.green
})

const DEFAULT_REPO_INDEX = 0

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
  latestClosedPrs: number | null
  latestEligiblePrs: number | null
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

function getLatestDetailValue(values?: number[]) {
  const value = Number(values?.at(-1))
  return Number.isFinite(value) ? value : null
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
        latestClosedPrs: getLatestDetailValue(entry?.details?.closedPrs),
        latestEligiblePrs: getLatestDetailValue(entry?.details?.eligiblePrs),
      }
    })
    .filter((option) => option.key)
})

const selectedRepoName = shallowRef<string | null>(null)
const repoSearch = shallowRef('')
const isRepoMenuOpen = shallowRef(false)
const activeRepoOptionIndex = shallowRef(0)

const selectedRepoOption = computed(() =>
  repoOptions.value.find((option) => option.key === selectedRepoName.value),
)

const filteredRepoOptions = computed(() => {
  const query = repoSearch.value.trim().toLowerCase()

  if (!query || query === selectedRepoName.value?.toLowerCase()) {
    return repoOptions.value
  }

  return repoOptions.value.filter((option) =>
    [option.key, option.owner, option.repo].some((value) =>
      value.toLowerCase().includes(query),
    ),
  )
})

const activeRepoOptionId = computed(() => {
  if (!isRepoMenuOpen.value || !filteredRepoOptions.value.length) {
    return undefined
  }

  return `repository-option-${activeRepoOptionIndex.value}`
})

const selectedRepoCount = computed(() => (selectedRepoName.value ? 1 : 0))

watch(
  repoOptions,
  (options) => {
    if (!options.length) {
      selectedRepoName.value = null
      repoSearch.value = ''
      isRepoMenuOpen.value = false
      return
    }

    const selectedRepoIsAvailable = options.some(
      (option) => option.key === selectedRepoName.value,
    )
    const nextRepoName =
      selectedRepoIsAvailable && selectedRepoName.value
        ? selectedRepoName.value
        : (options[DEFAULT_REPO_INDEX]?.key ?? options[0]?.key ?? null)

    if (!nextRepoName) {
      return
    }
    const selectionChanged = selectedRepoName.value !== nextRepoName

    selectedRepoName.value = nextRepoName

    if (selectionChanged || !isRepoMenuOpen.value) {
      repoSearch.value = nextRepoName
    }
  },
  { immediate: true },
)

watch(filteredRepoOptions, (options) => {
  if (!options.length) {
    activeRepoOptionIndex.value = 0
    return
  }

  activeRepoOptionIndex.value = Math.min(
    activeRepoOptionIndex.value,
    options.length - 1,
  )
})

function openRepoMenu(event?: FocusEvent) {
  isRepoMenuOpen.value = true

  const selectedIndex = filteredRepoOptions.value.findIndex(
    (option) => option.key === selectedRepoName.value,
  )
  activeRepoOptionIndex.value = selectedIndex >= 0 ? selectedIndex : 0

  if (event?.target instanceof HTMLInputElement) {
    event.target.select()
  }
}

function closeRepoMenu() {
  isRepoMenuOpen.value = false
}

function resetRepoSearch() {
  repoSearch.value = selectedRepoOption.value?.key ?? ''
}

function onRepoSearchInput() {
  isRepoMenuOpen.value = true
  activeRepoOptionIndex.value = 0
}

function handleRepoSelectorEscape() {
  resetRepoSearch()
  closeRepoMenu()
}

function getRepoOptionClass(index: number) {
  return index === activeRepoOptionIndex.value
    ? 'bg-current/10'
    : 'hover:bg-current/5'
}

function getRepoIndicatorStyle(repoName: string) {
  const color =
    repoName === selectedRepoName.value
      ? selectedRangeColor.value
      : 'transparent'

  return {
    borderColor: color,
    backgroundColor: color,
  }
}

function getRepoOptionStatus(option: RepoSelectorOption) {
  return option.hasData ? (option.latestValue ?? '—') : 'No data'
}

function selectRepo(option: RepoSelectorOption) {
  selectedRepoName.value = option.key
  repoSearch.value = option.key
  closeRepoMenu()
}

function selectActiveRepoOption() {
  const option = filteredRepoOptions.value[activeRepoOptionIndex.value]

  if (option) {
    selectRepo(option)
  }
}

function moveActiveRepoOption(direction: 1 | -1) {
  if (!isRepoMenuOpen.value) {
    openRepoMenu()
    return
  }

  const optionCount = filteredRepoOptions.value.length

  if (!optionCount) {
    return
  }

  activeRepoOptionIndex.value =
    (activeRepoOptionIndex.value + direction + optionCount) % optionCount
}

function commitRepoSearch() {
  const query = repoSearch.value.trim().toLowerCase()
  const exactMatch = repoOptions.value.find(
    (option) => option.key.toLowerCase() === query,
  )

  if (exactMatch) {
    selectRepo(exactMatch)
    return
  }

  resetRepoSearch()
  closeRepoMenu()
}

function handleRepoSelectorFocusOut(event: FocusEvent) {
  const selector = event.currentTarget as HTMLElement
  const nextTarget = event.relatedTarget as Node | null

  if (nextTarget && selector.contains(nextTarget)) {
    return
  }

  commitRepoSearch()
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
  if (!selectedRepoName.value) {
    return []
  }

  const chart = rawSparklineByRepoName.value.get(selectedRepoName.value)
  return chart ? [chart] : []
})

const sparklines = computed<SparklineChart[]>(() => {
  return selectedRawSparklines.value.map((dataset) => {
    return dataset.map((datapoint) => ({
      ...datapoint,
      color: selectedRangeColor.value,
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
    height: 300,
    padding: {
      right: 100,
      top: 20,
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
  color?: string
  plots?: Array<{ x: number; y: number; value: number }>
}

function getSvgSeries(data: unknown): SvgSerieItem[] {
  return Array.isArray(data) ? (data as SvgSerieItem[]) : []
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
      color: selectedRangeColor.value ?? 'currentColor',
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
      aria-labelledby="repository-selector-label"
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

      <div class="mb-2">
        <label
          id="repository-selector-label"
          for="repository-selector-input"
          class="m-0 text-sm font-semibold leading-tight"
        >
          Featured repositories
        </label>
        <p class="m-0 text-xs text-gh-muted">
          Search for and select one repository.
        </p>
      </div>

      <div class="relative" @focusout="handleRepoSelectorFocusOut">
        <div class="relative">
          <input
            id="repository-selector-input"
            v-model="repoSearch"
            type="text"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="repository-selector-options"
            :aria-expanded="isRepoMenuOpen"
            :aria-activedescendant="activeRepoOptionId"
            class="w-full rounded-md border border-gh-border bg-transparent px-3 py-2 pr-10 text-sm outline-none transition placeholder:text-gh-muted focus:border-current/30 focus:ring-2 focus:ring-current/20"
            placeholder="Search repositories"
            @click="openRepoMenu"
            @focus="openRepoMenu"
            @input="onRepoSearchInput"
            @keydown.down.prevent="moveActiveRepoOption(1)"
            @keydown.up.prevent="moveActiveRepoOption(-1)"
            @keydown.enter.prevent="selectActiveRepoOption"
            @keydown.esc.prevent="handleRepoSelectorEscape"
            @keydown.tab="commitRepoSearch"
          />
          <span
            class="i-lucide:chevron-down text-sm text-gh-muted transition-transform shrink-0 ml-auto pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gh-muted"
            :class="isRepoMenuOpen && 'rotate-180'"
          />
        </div>

        <ul
          v-if="isRepoMenuOpen"
          id="repository-selector-options"
          role="listbox"
          class="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gh-border bg-[var(--bg)] p-1 shadow-lg"
        >
          <li
            v-if="!filteredRepoOptions.length"
            class="px-3 py-2 text-sm text-gh-muted"
          >
            No repositories found.
          </li>
          <li
            v-for="(option, index) in filteredRepoOptions"
            :key="option.key"
            role="none"
          >
            <button
              :id="`repository-option-${index}`"
              type="button"
              role="option"
              :aria-selected="option.key === selectedRepoName"
              class="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs outline-none"
              :class="getRepoOptionClass(index)"
              @mouseenter="activeRepoOptionIndex = index"
              @mousedown.prevent
              @click="selectRepo(option)"
            >
              <span
                class="h-2.5 w-2.5 shrink-0 rounded-full border border-gh-border"
                :style="getRepoIndicatorStyle(option.key)"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 truncate font-medium leading-tight">
                <span class="text-gh-muted">{{ option.owner }}/</span>
                <span>{{ option.repo }}</span>
              </span>
              <span
                class="flex shrink-0 flex-row gap-2 px-1.5 text-[11px] leading-none text-gh-muted tabular-nums"
              >
                <span>
                  {{ getRepoOptionStatus(option) }}
                </span>

                <span
                  v-if="
                    option.latestClosedPrs !== null &&
                    option.latestEligiblePrs !== null
                  "
                >
                  ({{ option.latestClosedPrs }} /
                  {{ option.latestEligiblePrs }})
                </span>
              </span>
            </button>
          </li>
        </ul>
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
                v-for="serie in getSvgSeries(svg.data)"
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
