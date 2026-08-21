<script setup lang="ts">
import {
  VueUiWaffle,
  type VueUiWaffleConfig,
  type VueUiWaffleDatasetItem,
} from 'vue-data-ui/vue-ui-waffle'
import dayjs from 'dayjs'

import('vue-data-ui/style.css')

const { data: hourlyWindow } = await useEcosystemHealthHourlyWindow()

const rootEl = shallowRef<HTMLElement | null>(null)
const colors = useColors(rootEl)

/**
 * The buckets are UTC, but they are labelled in the reader's own time zone.
 * That can only be resolved in the browser, so everything below the header is
 * rendered client-side to keep the server from labelling the hours in UTC.
 */
const timeZone = shallowRef('')

onMounted(() => {
  rootEl.value = document.documentElement
  timeZone.value = Intl.DateTimeFormat().resolvedOptions().timeZone
})

type ScanItem = {
  date: string
  iso: string
  data: VueUiWaffleDatasetItem[]
  counts: { organic: number; mixed: number; automation: number }
  totalCount: number
}

const scanItems = computed<ScanItem[]>(() => {
  const entries = Object.entries(
    hourlyWindow.value?.countsByScanTime ?? {},
  ).slice(-24) // removing the first one so we have an even number of hours

  return entries.map(([date, item]) => {
    const counts = {
      organic: item.organic?.count ?? 0,
      mixed: item.mixed?.count ?? 0,
      automation: item.automation?.count ?? 0,
    }

    return {
      date: dayjs(date).format('HH:mm'),
      iso: date,
      data: [
        {
          name: 'Organic',
          values: [counts.organic],
          color: colors.value.organic,
        },
        {
          name: 'Mixed',
          values: [counts.mixed],
          color: colors.value.mixed,
        },
        {
          name: 'Automation',
          values: [counts.automation],
          color: colors.value.automation,
        },
      ],
      counts,
      totalCount: counts.organic + counts.mixed + counts.automation,
    }
  })
})

const summary = computed(() => {
  const items = scanItems.value

  const totals = items.reduce(
    (acc, item) => {
      acc.organic += item.counts.organic
      acc.mixed += item.counts.mixed
      acc.automation += item.counts.automation
      return acc
    },
    { organic: 0, mixed: 0, automation: 0 },
  )

  const ranked = [...items].sort((a, b) => b.totalCount - a.totalCount)
  const lastIso = items.at(-1)?.iso

  return {
    totals,
    total: totals.organic + totals.mixed + totals.automation,
    busiest: ranked.at(0),
    quietest: ranked.at(-1),
    hours: items.length,
    windowEnd: lastIso ? dayjs(lastIso).format('MMM D, HH:mm') : '',
  }
})

const legendEntries = computed(() => {
  const { totals, total } = summary.value

  return [
    { name: 'Organic', count: totals.organic, swatch: 'bg-ui-organic' },
    { name: 'Mixed', count: totals.mixed, swatch: 'bg-ui-mixed' },
    {
      name: 'Automation',
      count: totals.automation,
      swatch: 'bg-ui-automation',
    },
  ].map((entry) => ({
    ...entry,
    share: total ? Math.round((entry.count / total) * 100) : 0,
  }))
})

type VueUiWaffleConfigWithTime = VueUiWaffleConfig & { time: string }

const merged = shallowRef(false)

const modeOptions = [
  {
    value: false,
    label: 'Per PR',
    caption: 'Roughly one square per pull request, colored by classification.',
  },
  {
    value: true,
    label: 'Merged',
    caption: 'Squares of the same classification are merged into one block.',
  },
]

const waffles = computed<
  Array<{
    config: VueUiWaffleConfigWithTime
    dataset: VueUiWaffleDatasetItem[]
    totalCount: number
  }>
>(() => {
  return scanItems.value.map((scanItem) => ({
    config: {
      time: scanItem.date,
      userOptions: { show: false },
      useBlurOnHover: false,
      style: {
        chart: {
          backgroundColor: 'transparent',
          legend: { show: false },
          layout: {
            grid: {
              size: Math.ceil(Math.sqrt(scanItem.totalCount)) || 1,
            },
            rect: {
              rounded: true,
              rounding: 4,
              stroke: colors.value.bg,
              strokeWidth: 1,
              useGradient: false,
              merged: merged.value,
              selection: {
                unselectedOpacity: 1,
                wrap: {
                  show: true,
                  stroke: colors.value.text,
                  strokeWidth: 10,
                },
              },
            },
          },
          tooltip: {
            backgroundColor: colors.value.bg,
            color: colors.value.text,
            borderColor: colors.value.border,
            backgroundOpacity: 70,
          },
        },
      },
    },
    dataset: scanItem.data,
    totalCount: scanItem.totalCount,
  }))
})

function getTime(cfg: VueUiWaffleConfigWithTime) {
  return cfg.time
}

function getCountLabel(count: number) {
  return `${count} PR${count === 1 ? '' : 's'}`
}
</script>

<template>
  <div class="w-full">
    <ClientOnly>
      <!-- What the numbers add up to, before the grid itself -->
      <dl class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div
          class="rounded-2 border-1 border-solid border-ui-border/60 px-3 py-2.5"
        >
          <dt class="text-xs text-ui-muted">Pull requests scanned</dt>
          <dd class="mt-0.5 text-xl font-semibold text-ui-text">
            {{ summary.total }}
          </dd>
          <dd v-if="summary.windowEnd" class="text-xs text-ui-muted">
            {{ summary.hours }} hours to {{ summary.windowEnd }}
          </dd>
        </div>

        <div
          class="rounded-2 border-1 border-solid border-ui-border/60 px-3 py-2.5"
        >
          <dt class="text-xs text-ui-muted">Busiest hour</dt>
          <dd class="mt-0.5 text-xl font-semibold text-ui-text">
            {{ summary.busiest?.date ?? '—' }}
          </dd>
          <dd class="text-xs text-ui-muted">
            {{ getCountLabel(summary.busiest?.totalCount ?? 0) }}
          </dd>
        </div>

        <div
          class="col-span-2 rounded-2 border-1 border-solid border-ui-border/60 px-3 py-2.5 sm:col-span-1"
        >
          <dt class="text-xs text-ui-muted">Quietest hour</dt>
          <dd class="mt-0.5 text-xl font-semibold text-ui-text">
            {{ summary.quietest?.date ?? '—' }}
          </dd>
          <dd class="text-xs text-ui-muted">
            {{ getCountLabel(summary.quietest?.totalCount ?? 0) }}
          </dd>
        </div>
      </dl>

      <!-- Legend: identity never comes from the text color, only from the swatch -->
      <div
        class="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <ul class="flex flex-col flex-wrap gap-x-5 gap-y-2">
          <li
            v-for="entry in legendEntries"
            :key="entry.name"
            class="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              :class="entry.swatch"
            />
            <span class="text-sm text-ui-text">{{ entry.name }}</span>
            <span class="text-sm text-ui-muted">
              {{ entry.count }} · {{ entry.share }}%
            </span>
          </li>
        </ul>

        <div class="flex flex-col items-start gap-1 sm:items-end sm:text-right">
          <Toggle
            v-model="merged"
            :options="modeOptions"
            label="Waffle rendering mode"
          />
        </div>
      </div>

      <p class="mt-8 text-sm text-ui-muted">
        One tile per hour, oldest first. Each tile holds roughly one square per
        pull request opened during that hour, so a denser tile is a busier hour.
        Hover a square for its classification, or a tile for its hour and total.
        Hours are shown in your local time<template v-if="timeZone">
          ({{ timeZone }})</template
        >.
      </p>

      <div
        class="mt-5 grid grid-cols-6 gap-x-1.5 gap-y-2 sm:grid-cols-8 sm:gap-x-2 lg:grid-cols-6"
      >
        <div
          v-for="(waffle, i) in waffles"
          :key="i"
          class="flex flex-col gap-1"
        >
          <div
            v-if="!waffle.totalCount"
            class="aspect-square rounded-1 border-1 border-dashed border-ui-border/60"
          />

          <VueUiWaffle v-else :dataset="waffle.dataset" :config="waffle.config">
            <template #tooltip="{ datapoint, config }">
              <div class="flex flex-col text-xs">
                <div class="mb-1 flex flex-row gap-2">
                  <span>{{
                    getTime(config as VueUiWaffleConfigWithTime)
                  }}</span>
                </div>

                <div class="flex flex-row items-center gap-1">
                  <div
                    class="h-2 w-2 rounded-full"
                    :style="{ backgroundColor: datapoint.color }"
                  />
                  <span>{{ datapoint.name }}</span>
                </div>

                <div class="flex flex-row justify-between gap-2">
                  <span>Count:</span>
                  <div class="flex flex-row gap-1">
                    <span>{{ datapoint.value }}</span>
                    <span>({{ datapoint.proportion }}%)</span>
                  </div>
                </div>
              </div>
            </template>
          </VueUiWaffle>

          <span
            class="text-center text-[10px] leading-none text-ui-muted"
            :title="getCountLabel(waffle.totalCount)"
          >
            {{ waffle.config.time }}
          </span>
        </div>
      </div>
    </ClientOnly>
  </div>
</template>
