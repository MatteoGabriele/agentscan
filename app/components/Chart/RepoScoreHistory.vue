<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTooltipPosition } from 'vue-data-ui/composables'
import { getTrendArrow } from '#imports'
import {
  VueUiSparkline,
  type VueUiSparklineConfig,
  type VueUiSparklineDatasetItem,
} from 'vue-data-ui/vue-ui-sparkline'
import {
  VueUiXy,
  type VueUiXyConfig,
  type VueUiXyDatasetItem,
  type VueUiXyTooltipSlotProps,
} from 'vue-data-ui/vue-ui-xy'

const { data, pending, error } = await useActivityRepoScores({
  full: true,
})

const rootEl = shallowRef<HTMLElement | null>(null)
const chartRef = useTemplateRef('chartRef')

onMounted(() => {
  rootEl.value = document.documentElement
})

const colors = useColors(rootEl)

const locale = computed(() => 'en') // in case i18n is implemented in the future
const selectedRepo = ref('')
const repoSearch = ref('')
const from = ref<string>()
const to = ref<string>()

const isAllRepos = computed(() => selectedRepo.value === '')

const controlClass =
  'h-10 border border-current/20 rounded-md bg-transparent px-3 text-sm text-inherit outline-none transition-colors hover:border-current/40 focus:border-current/60 focus-visible:ring-1 focus-visible:ring-current/20'

const days = computed(() => {
  const value = data.value

  if (!value || !('days' in value)) {
    return []
  }

  return value.days
})

const availableDates = computed(() => {
  return [...(data.value?.dates ?? [])].sort()
})

const availableRepos = computed(() => {
  const repos = new Set<string>()

  for (const day of days.value) {
    for (const repo of day.repos) {
      repos.add(repo.name)
    }
  }

  return [...repos].sort()
})

watch(
  availableDates,
  (dates) => {
    if (!dates.length) {
      return
    }

    from.value ??= dates[0]
    to.value ??= dates.at(-1)
  },
  {
    immediate: true,
  },
)

const minDate = computed(() => {
  return availableDates.value[0] ?? ''
})

const maxDate = computed(() => {
  return availableDates.value.at(-1) ?? ''
})

const fromMax = computed(() => {
  return to.value || maxDate.value
})

const toMin = computed(() => {
  return from.value || minDate.value
})

type RepoSeries = {
  dataset: VueUiSparklineDatasetItem[]
  count: number
  scoreSum: number
}

const repoSeries = computed(() => {
  const datasets = new Map<string, RepoSeries>()

  for (const repo of availableRepos.value) {
    datasets.set(repo, {
      dataset: [],
      count: 0,
      scoreSum: 0,
    })
  }

  for (const day of days.value) {
    if (from.value && day.date < from.value) {
      continue
    }

    if (to.value && day.date > to.value) {
      continue
    }

    const period = String(new Date(day.date).getTime())

    for (const repo of day.repos) {
      if (!repo.count) {
        continue
      }

      const entry = datasets.get(repo.name)

      if (!entry) {
        continue
      }

      entry.dataset.push({
        period,
        value: (repo.scoreSum ?? 0) / repo.count,
      })

      entry.count += repo.count
      entry.scoreSum += repo.scoreSum
    }
  }

  return datasets
})

const selectedRepoDataset = computed(() => {
  if (isAllRepos.value) {
    return []
  }

  return repoSeries.value.get(selectedRepo.value)?.dataset ?? []
})

const timeLabels = computed(() =>
  selectedRepoDataset.value.map((d) => Number(d.period)),
)

const XAXIS_LABELS_MOD_THRESHOLD = 12
const TIME_LABEL_FORMAT = 'MMM dd'

const tooltipPositionLine = useTooltipPosition(chartRef)

const configLine = computed<VueUiXyConfig>(() => ({
  line: {
    useGradient: false,
    dot: {
      useSerieColor: false,
      fill: colors.value.bg,
      strokeWidth: 1,
    },
  },
  chart: {
    userOptions: {
      show: false,
    },
    legend: {
      show: false,
    },
    backgroundColor: colors.value.bg,
    color: colors.value.text,
    padding: {
      right: 48,
    },
    grid: {
      position: 'start',
      stroke: colors.value.border,
      labels: {
        color: colors.value.textMuted,
        yAxis: {
          position: 'right',
          scaleMin: 0,
          scaleMax: 100,
        },
        xAxisLabels: {
          values: timeLabels.value,
          color: colors.value.textMuted,
          showOnlyAtModulo:
            timeLabels.value.length > XAXIS_LABELS_MOD_THRESHOLD,
          modulo: Math.max(
            1,
            Math.round(timeLabels.value.length / XAXIS_LABELS_MOD_THRESHOLD),
          ),
          rotation: -30,
          autoRotate: {
            enable: false,
          },
          datetimeFormatter: {
            enable: true,
            options: {
              year: TIME_LABEL_FORMAT,
              month: TIME_LABEL_FORMAT,
              day: TIME_LABEL_FORMAT,
              hour: TIME_LABEL_FORMAT,
              minute: TIME_LABEL_FORMAT,
              second: TIME_LABEL_FORMAT,
            },
          },
        },
      },
    },
    highlighter: {
      useLine: true,
      opacity: 0,
      color: colors.value.textMuted,
    },
    tooltip: {
      backgroundColor: colors.value.bg,
      color: colors.value.text,
      borderColor: colors.value.border,
      backgroundOpacity: 30,
      position: tooltipPositionLine.value,
      offsetX: 24,
      offsetY: -32,
    },
    zoom: {
      show: false,
    },
  },
}))

const datasetLine = computed<VueUiXyDatasetItem[]>(() => {
  return [
    {
      name: selectedRepo.value,
      type: 'line',
      smooth: true,
      series: selectedRepoDataset.value.map((d) => d.value ?? 0),
      color: colors.value.text,
    },
  ]
})

const tooltipTimeLabels = computed<string[]>(() => {
  return timeLabels.value.map((timestamp) => {
    return new Intl.DateTimeFormat(locale.value, {
      timeZone: 'UTC',
      day: '2-digit',
      month: 'short',
    }).format(timestamp)
  })
})

function getTooltipTimeLabel(index: number): string {
  return tooltipTimeLabels.value[index] ?? ''
}

function getScoreColor(score: number) {
  return score >= 70
    ? colors.value.organic
    : score >= 50 && score < 70
      ? colors.value.mixed
      : colors.value.automation
}

function getDatapointScore(datapoint: VueUiXyTooltipSlotProps['datapoint']) {
  const score = Math.round((datapoint[0] ?? { value: 0 }).value ?? 0)
  const color = getScoreColor(score)
  return {
    score,
    color,
  }
}

type RepoRow = {
  repo: string
  dataset: VueUiSparklineDatasetItem[]
  progression: number
  averageScore: number
  count: number
  visible: boolean
}

const sparklines = computed<RepoRow[]>(() => {
  return [...repoSeries.value.entries()].map(
    ([repo, { dataset, count, scoreSum }]) => ({
      repo,
      dataset,
      count,
      progression: calcLinearProgression(dataset.map((d) => d.value ?? 0))
        .trend,
      averageScore: count ? Math.round(scoreSum / count) : 0,
      visible: dataset.length > 1,
    }),
  )
})

type SortKey = 'progression' | 'repo' | 'averageScore' | 'count'

type SortDirection = 'asc' | 'desc'

const sortKey = ref<SortKey>('count')
const sortDirection = ref<SortDirection>('desc')

const sortedSparklines = computed(() => {
  const direction = sortDirection.value === 'asc' ? 1 : -1
  const query = repoSearch.value.trim().toLocaleLowerCase()

  const rows = query
    ? sparklines.value.filter((item) =>
        item.repo.toLocaleLowerCase().includes(query),
      )
    : sparklines.value

  return [...rows].sort((a, b) => {
    if (sortKey.value === 'repo') {
      return a.repo.localeCompare(b.repo) * direction
    }
    return (a[sortKey.value] - b[sortKey.value]) * direction
  })
})

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

function getAriaSort(key: SortKey) {
  if (sortKey.value !== key) {
    return 'none' as const
  }

  return sortDirection.value === 'asc'
    ? ('ascending' as const)
    : ('descending' as const)
}

function getSortIndicator(key: SortKey) {
  if (sortKey.value !== key) {
    return '↕'
  }

  return sortDirection.value === 'asc' ? '↑' : '↓'
}

function getTrendColor(trend: number) {
  return trend === 0
    ? 'text-[--text-muted]'
    : trend < 0
      ? 'text-[--automation]'
      : 'text-[--organic]'
}

function getLineColor(trend: number) {
  return trend === 0
    ? colors.value.textMuted
    : trend < 0
      ? colors.value.automation
      : colors.value.organic
}

function getArrowClasses(item: RepoRow) {
  return `${getTrendArrow(item.progression)} ${getTrendColor(item.progression)}`
}

async function viewRepoChart(item: RepoRow) {
  selectedRepo.value = item.repo
}

function getSparklineConfig(item: RepoRow): VueUiSparklineConfig {
  return {
    style: {
      animation: { show: false },
      area: {
        show: false,
      },
      backgroundColor: 'transparent',
      dataLabel: {
        show: false,
      },
      line: {
        color: getLineColor(item.progression),
        smooth: true,
      },
      scaleMin: 0,
      scaleMax: 100,
    },
  }
}
</script>

<template>
  <div>
    <div class="mb-5">
      <h2 class="text-center">Average score evolution</h2>

      <p class="text-sm text-ui-muted text-center">
        Evolution of the average score of scanned PRs for featured repositories
      </p>
    </div>

    <div class="flex flex-row flex-nowrap items-end gap-4">
      <Tooltip :label="selectedRepo === '' ? '' : 'Toggle table view'">
        <button
          class="shrink-0 inline-flex items-center rounded-sm border border-ui-border-subtle/60 p-3 text-xs text-ui-muted tabular-nums transition-colors cursor-pointer"
          :class="{
            'cursor-not-allowed opacity-50': !selectedRepo,
            'hover:text-ui-text hover:border-ui-border/80': !!selectedRepo,
          }"
          @click="selectedRepo = ''"
        >
          <span class="i-lucide:table" />
        </button>
      </Tooltip>

      <div
        v-if="availableDates.length"
        class="grid w-full grid-cols-1 gap-3 md:grid-cols-4"
      >
        <label class="grid w-full gap-1 md:col-span-2">
          <span class="text-sm">Repository</span>

          <select v-model="selectedRepo" :class="[controlClass, 'w-full']">
            <option value="">All repositories</option>

            <option v-for="repo in availableRepos" :key="repo" :value="repo">
              {{ repo }}
            </option>
          </select>
        </label>

        <label class="grid w-full gap-1">
          <span class="text-sm">From</span>

          <input
            v-model="from"
            type="date"
            :min="minDate"
            :max="fromMax"
            :class="[controlClass, 'w-full']"
          />
        </label>

        <label class="grid w-full gap-1">
          <span class="text-sm">To</span>

          <input
            v-model="to"
            type="date"
            :min="toMin"
            :max="maxDate"
            :class="[controlClass, 'w-full']"
          />
        </label>
      </div>
    </div>

    <ClientOnly>
      <!-- REPO CHART VIEW -->
      <div v-if="!isAllRepos && !pending && !error">
        <div class="flex flex-row gap-2 justify-center mt-8">
          <Tooltip label="Open repository scan">
            <NuxtLink
              :to="`/scan/${encodeURIComponent(selectedRepo)}`"
              class="inline-flex items-center justify-center rounded-sm border border-current/15 p-1.5 text-ui-muted transition-colors hover:border-current/30 hover:text-ui-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20"
              :aria-label="`Open repository scan for ${selectedRepo}`"
            >
              <span class="i-lucide:scan-search text-sm" aria-hidden="true" />
            </NuxtLink>
          </Tooltip>

          <Tooltip label="Open repository on GitHub">
            <a
              :href="`https://github.com/${selectedRepo}`"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center rounded-sm border border-current/15 p-1.5 text-ui-muted transition-colors hover:border-current/30 hover:text-ui-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20"
              :aria-label="`Open ${selectedRepo} on GitHub`"
            >
              <span class="i-lucide:github text-sm" aria-hidden="true" />
            </a>
          </Tooltip>
        </div>
        <VueUiXy
          v-if="!isAllRepos && !pending && !error"
          ref="chartRef"
          :dataset="datasetLine"
          :config="configLine"
        >
          <template #tooltip="{ datapoint, seriesIndex }">
            <div class="flex flex-col">
              <div class="mb-1">
                {{ getTooltipTimeLabel(seriesIndex) }}
              </div>

              <div class="flex flex-row gap-2 items-center">
                <div class="w-2 h-2">
                  <svg viewBox="0 0 2 2" class="w-full h-full">
                    <circle
                      :cx="1"
                      :cy="1"
                      :r="1"
                      :fill="getDatapointScore(datapoint).color"
                    />
                  </svg>
                </div>

                <div>
                  Average score:
                  {{ getDatapointScore(datapoint).score }}
                </div>
              </div>
            </div>
          </template>

          <template #svg="{ svg }">
            <path
              :d="`M${svg.drawingArea.right + 48},${svg.drawingArea.top + 2} ${svg.drawingArea.right + 52},${svg.drawingArea.top + 6} ${svg.drawingArea.right + 52},${svg.drawingArea.top + svg.drawingArea.height * 0.3 - 6} ${svg.drawingArea.right + 48},${svg.drawingArea.top + svg.drawingArea.height * 0.3 - 2}`"
              :stroke="colors.organic"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />

            <text
              text-anchor="middle"
              :fill="colors.textMuted"
              :transform="`translate(${svg.drawingArea.right + 76},${svg.drawingArea.top + svg.drawingArea.height * 0.15}) rotate(-90)`"
            >
              Organic
            </text>

            <path
              :d="`M${svg.drawingArea.right + 48},${svg.drawingArea.top + svg.drawingArea.height * 0.3 + 2} ${svg.drawingArea.right + 52},${svg.drawingArea.top + svg.drawingArea.height * 0.3 + 6} ${svg.drawingArea.right + 52},${svg.drawingArea.top + svg.drawingArea.height * 0.5 - 6} ${svg.drawingArea.right + 48},${svg.drawingArea.top + svg.drawingArea.height * 0.5 - 2}`"
              :stroke="colors.mixed"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />

            <text
              text-anchor="middle"
              :fill="colors.textMuted"
              :transform="`translate(${svg.drawingArea.right + 76},${svg.drawingArea.top + svg.drawingArea.height * 0.4}) rotate(-90)`"
            >
              Mixed
            </text>

            <path
              :d="`M${svg.drawingArea.right + 48},${svg.drawingArea.top + svg.drawingArea.height * 0.5 + 2} ${svg.drawingArea.right + 52},${svg.drawingArea.top + svg.drawingArea.height * 0.5 + 6} ${svg.drawingArea.right + 52},${svg.drawingArea.top + svg.drawingArea.height - 6} ${svg.drawingArea.right + 48},${svg.drawingArea.top + svg.drawingArea.height - 2}`"
              :stroke="colors.automation"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
            />

            <text
              text-anchor="middle"
              :fill="colors.textMuted"
              :transform="`translate(${svg.drawingArea.right + 76},${svg.drawingArea.top + svg.drawingArea.height * 0.75}) rotate(-90)`"
            >
              Automation
            </text>
          </template>
        </VueUiXy>
      </div>

      <!-- TABLE VIEW (all repos) -->
      <div
        v-else
        class="mt-6 max-h-[min(70vh,48rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-current/10"
      >
        <div
          class="sticky top-0 z-20 h-11 border-b border-current/10 bg-[--card]"
        >
          <label class="relative block h-full w-full">
            <span class="sr-only">Search repositories</span>

            <span
              class="i-lucide:search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted sm:left-4"
              aria-hidden="true"
            />

            <input
              v-model="repoSearch"
              type="search"
              autocomplete="off"
              placeholder="Search repositories..."
              class="h-full w-full bg-transparent pl-9 pr-10 text-sm text-inherit outline-none placeholder:text-ui-muted/70 focus:bg-current/[0.025] sm:pl-10"
            />

            <button
              v-if="repoSearch"
              type="button"
              class="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-sm p-1 text-ui-muted transition-colors hover:text-ui-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20 sm:right-3"
              aria-label="Clear repository search"
              @click="repoSearch = ''"
            >
              <span class="i-lucide:x" aria-hidden="true" />
            </button>
          </label>
        </div>

        <table
          class="w-full table-fixed border-separate border-spacing-0 text-xs sm:text-sm lg:table-auto"
        >
          <thead class="sticky top-11 z-10 bg-[--card] text-ui-muted">
            <tr class="bg-[--card]">
              <th
                scope="col"
                :aria-sort="getAriaSort('progression')"
                class="w-14 bg-[--card] px-2 py-3 text-left font-medium sm:w-24 sm:px-4 lg:w-20"
              >
                <button
                  type="button"
                  class="flex w-full items-center justify-center gap-1 rounded-sm transition-colors hover:text-inherit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20 sm:justify-start sm:gap-2 cursor-pointer"
                  @click="sortBy('progression')"
                >
                  <span class="hidden sm:inline">Trend</span>

                  <span
                    class="text-xs"
                    :class="
                      sortKey === 'progression' ? 'text-inherit' : 'opacity-35'
                    "
                    aria-hidden="true"
                  >
                    {{ getSortIndicator('progression') }}
                  </span>
                </button>
              </th>

              <th
                scope="col"
                :aria-sort="getAriaSort('repo')"
                class="bg-[--card] px-2 py-3 text-left font-medium sm:px-4"
              >
                <button
                  type="button"
                  class="flex w-full min-w-0 items-center gap-1 rounded-sm text-left transition-colors hover:text-inherit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20 sm:gap-2 cursor-pointer"
                  @click="sortBy('repo')"
                >
                  <span class="truncate lg:overflow-visible lg:text-clip">
                    Repository
                  </span>

                  <span
                    class="shrink-0 text-xs"
                    :class="sortKey === 'repo' ? 'text-inherit' : 'opacity-35'"
                    aria-hidden="true"
                  >
                    {{ getSortIndicator('repo') }}
                  </span>
                </button>
              </th>

              <th
                scope="col"
                :aria-sort="getAriaSort('averageScore')"
                class="w-18 bg-[--card] px-2 py-3 text-right font-medium sm:w-36 sm:px-4 lg:w-32"
              >
                <button
                  type="button"
                  class="flex w-full items-center justify-end gap-1 rounded-sm text-right transition-colors hover:text-inherit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20 sm:gap-2 cursor-pointer"
                  @click="sortBy('averageScore')"
                >
                  <span class="hidden sm:inline">Average score</span>
                  <span class="sm:hidden">Score</span>

                  <span
                    class="shrink-0 text-xs"
                    :class="
                      sortKey === 'averageScore' ? 'text-inherit' : 'opacity-35'
                    "
                    aria-hidden="true"
                  >
                    {{ getSortIndicator('averageScore') }}
                  </span>
                </button>
              </th>

              <th
                scope="col"
                :aria-sort="getAriaSort('count')"
                class="w-16 bg-[--card] px-2 py-3 text-right font-medium sm:w-32 sm:px-4 lg:w-28"
              >
                <button
                  type="button"
                  class="flex w-full items-center justify-end gap-1 rounded-sm text-right transition-colors hover:text-inherit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20 sm:gap-2 cursor-pointer"
                  @click="sortBy('count')"
                >
                  <span class="hidden sm:inline">Scanned PRs</span>
                  <span class="sm:hidden">PRs</span>

                  <span
                    class="shrink-0 text-xs"
                    :class="sortKey === 'count' ? 'text-inherit' : 'opacity-35'"
                    aria-hidden="true"
                  >
                    {{ getSortIndicator('count') }}
                  </span>
                </button>
              </th>

              <th
                scope="col"
                class="hidden w-44 bg-[--card] px-4 py-3 text-right font-medium lg:table-cell"
              >
                Evolution
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="sparkline in sortedSparklines"
              :key="sparkline.repo"
              class="border-t border-current/10 transition-colors hover:bg-[--card]"
            >
              <td class="px-2 py-3 text-center sm:px-4 sm:text-left">
                <span
                  :class="getArrowClasses(sparkline)"
                  class="shrink-0 align-middle"
                />
              </td>

              <td class="min-w-0 px-2 py-3 font-medium sm:px-4">
                <div class="flex min-w-0 flex-col items-start gap-2">
                  <span
                    class="block max-w-full truncate lg:overflow-visible lg:text-clip lg:whitespace-normal"
                    :title="sparkline.repo"
                  >
                    {{ sparkline.repo }}
                  </span>

                  <div class="flex items-center gap-1">
                    <Tooltip label="View chart" v-if="sparkline.visible">
                      <button
                        type="button"
                        class="inline-flex items-center justify-center rounded-sm border border-current/15 p-1.5 text-ui-muted transition-colors hover:border-current/30 hover:text-ui-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20"
                        :aria-label="`View chart for ${sparkline.repo}`"
                        @click="viewRepoChart(sparkline)"
                      >
                        <span
                          class="i-lucide:chart-line text-sm"
                          aria-hidden="true"
                        />
                      </button>
                    </Tooltip>

                    <Tooltip label="Open repository scan">
                      <NuxtLink
                        :to="`/scan/${encodeURIComponent(sparkline.repo)}`"
                        class="inline-flex items-center justify-center rounded-sm border border-current/15 p-1.5 text-ui-muted transition-colors hover:border-current/30 hover:text-ui-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20"
                        :aria-label="`Open repository scan for ${sparkline.repo}`"
                      >
                        <span
                          class="i-lucide:scan-search text-sm"
                          aria-hidden="true"
                        />
                      </NuxtLink>
                    </Tooltip>

                    <Tooltip label="Open repository on GitHub">
                      <a
                        :href="`https://github.com/${sparkline.repo}`"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="inline-flex items-center justify-center rounded-sm border border-current/15 p-1.5 text-ui-muted transition-colors hover:border-current/30 hover:text-ui-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/20"
                        :aria-label="`Open ${sparkline.repo} on GitHub`"
                      >
                        <span
                          class="i-lucide:github text-sm"
                          aria-hidden="true"
                        />
                      </a>
                    </Tooltip>
                  </div>
                </div>
              </td>

              <td class="px-2 py-3 text-right tabular-nums sm:px-4">
                <div class="flex items-center justify-end gap-2">
                  <div class="w-2 h-2">
                    <svg viewBox="0 0 2 2" class="w-full h-full">
                      <circle
                        :cx="1"
                        :cy="1"
                        :r="1"
                        :fill="getScoreColor(sparkline.averageScore)"
                      />
                    </svg>
                  </div>
                  <span>
                    {{ sparkline.averageScore }}
                  </span>
                </div>
              </td>

              <td
                class="px-2 py-3 text-right tabular-nums text-ui-muted sm:px-4"
              >
                {{ sparkline.count }}
              </td>

              <td class="hidden w-44 px-4 py-2 lg:table-cell">
                <div class="ml-auto w-40">
                  <Tooltip
                    v-if="sparkline.visible"
                    label="View chart"
                    class="w-full"
                  >
                    <button
                      class="w-full cursor-pointer"
                      @click="viewRepoChart(sparkline)"
                      :aria-label="`View chart for ${sparkline.repo}`"
                    >
                      <VueUiSparkline
                        :dataset="sparkline.dataset"
                        :config="getSparklineConfig(sparkline)"
                        class="pointer-events-none"
                      />
                    </button>
                  </Tooltip>
                  <div v-else class="text-[--text-muted] text-xs text-center">
                    Insufficient data
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ClientOnly>
  </div>
</template>
