<script setup lang="ts">
import dayjs from 'dayjs'
import type { ActivityCategory, ActivityItem } from '~~/shared/types/activity'
import { classifyByScore } from '~~/shared/utils/activity-stats'
import { CLASSIFICATIONS_WITH_NAME_AND_CATEGORY } from '~~/shared/utils/charts'
import { formatCompactNumber, median } from '~~/shared/utils/numbers'

const { data: hourlyWindow } = useActivityHourlyWindow()

const isMobile = useIsMobile()

const SWATCH: Record<ActivityCategory, string> = {
  organic: 'bg-ui-organic',
  mixed: 'bg-ui-mixed',
  automation: 'bg-ui-automation',
}

const CHART_HEIGHT = 280

type LineStats = {
  prs: number
  added: number | null
  deleted: number | null
}

function getLineStats(items: ActivityItem[]): LineStats {
  return {
    prs: items.length,
    added: median(items.map((item) => item.additions)),
    deleted: median(items.map((item) => item.deletions)),
  }
}

function groupByCategory(items: ActivityItem[]) {
  const groups: Record<ActivityCategory, ActivityItem[]> = {
    organic: [],
    mixed: [],
    automation: [],
  }

  items.forEach((item) => {
    const classification = classifyByScore(item.score)

    if (classification !== 'insufficient-data') {
      groups[classification].push(item)
    }
  })

  return groups
}

function getStatsByCategory(items: ActivityItem[]) {
  const groups = groupByCategory(items)

  return CLASSIFICATIONS_WITH_NAME_AND_CATEGORY.map(({ name, category }) => ({
    name,
    category,
    ...getLineStats(groups[category]),
  }))
}

const hours = computed(() => {
  const results = hourlyWindow.value?.results ?? []
  const scanTimes = (hourlyWindow.value?.scanTimes ?? []).slice(
    isMobile.value ? -12 : -24,
  )

  return scanTimes.map((scanTime) => ({
    iso: scanTime,
    label: dayjs(scanTime).format('HH:mm'),
    categories: getStatsByCategory(
      results.filter((item) => item.created_at === scanTime),
    ),
  }))
})

type Hour = (typeof hours.value)[number]

const windowStats = computed(() => {
  const isos = new Set(hours.value.map((hour) => hour.iso))

  return getStatsByCategory(
    (hourlyWindow.value?.results ?? []).filter((item) =>
      isos.has(item.created_at),
    ),
  )
})

const scale = computed(() => {
  const values = hours.value.flatMap((hour) => hour.categories)
  const maxAdded = Math.max(1, ...values.map((stats) => stats.added ?? 0))
  const maxDeleted = Math.max(1, ...values.map((stats) => stats.deleted ?? 0))
  const total = maxAdded + maxDeleted

  return {
    maxAdded,
    maxDeleted,
    addedHeight: (CHART_HEIGHT * maxAdded) / total,
    deletedHeight: (CHART_HEIGHT * maxDeleted) / total,
  }
})

function getBarHeight(value: number | null, max: number) {
  return value ? `${(value / max) * 100}%` : '0%'
}

const activeIndex = shallowRef<number | null>(null)

const activeHour = computed(
  () => hours.value[activeIndex.value ?? hours.value.length - 1],
)

function formatLines(value: number | null, sign: '+' | '−') {
  return value === null
    ? '—'
    : `${sign}${formatCompactNumber(Math.round(value))}`
}

function getPrLabel(count: number) {
  return `${count} PR${count === 1 ? '' : 's'}`
}

function getHourLabel(hour: Hour) {
  const categories = hour.categories.map(
    (stats) =>
      `${stats.name} ${formatLines(stats.added, '+')} ${formatLines(stats.deleted, '−')}`,
  )

  return `${hour.label}: ${categories.join(', ')}`
}

function isTickVisible(index: number) {
  const step = isMobile.value ? 3 : 6
  return (hours.value.length - 1 - index) % step === 0
}
</script>

<template>
  <div class="w-full">
    <ClientOnly>
      <!-- The window-wide comparison first, the hour by hour detail below -->
      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          v-for="stats in windowStats"
          :key="stats.category"
          class="rounded-2 border-1 border-solid border-ui-border/60 px-3 py-2.5"
        >
          <dt class="flex items-center gap-2 text-xs text-ui-muted">
            <span
              aria-hidden="true"
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              :class="SWATCH[stats.category]"
            />
            {{ stats.name }}
          </dt>
          <dd class="mt-0.5 text-xl font-semibold tabular-nums text-ui-text">
            {{ formatLines(stats.added, '+') }}
            <span class="text-ui-muted"
              >/ {{ formatLines(stats.deleted, '−') }}</span
            >
          </dd>
          <dd class="text-xs text-ui-muted">
            median lines per PR · {{ getPrLabel(stats.prs) }}
          </dd>
        </div>
      </dl>

      <p class="mt-8 text-sm text-ui-muted">
        Median lines added (above the line) and deleted (below it) per pull
        request, for each hour and classification.
      </p>

      <div class="mt-5 flex gap-2">
        <div
          aria-hidden="true"
          class="relative shrink-0 text-right text-[10px] leading-none text-ui-muted tabular-nums"
          :style="{ height: `${CHART_HEIGHT}px` }"
        >
          <span class="invisible">{{
            formatLines(Math.max(scale.maxAdded, scale.maxDeleted), '+')
          }}</span>
          <span class="absolute right-0 top-0">{{
            formatLines(scale.maxAdded, '+')
          }}</span>
          <span
            class="absolute right-0 -translate-y-1/2"
            :style="{ top: `${scale.addedHeight}px` }"
            >0</span
          >
          <span class="absolute right-0 bottom-0">{{
            formatLines(scale.maxDeleted, '−')
          }}</span>
        </div>

        <div class="flex flex-1 items-stretch" @mouseleave="activeIndex = null">
          <button
            v-for="(hour, index) in hours"
            :key="hour.iso"
            type="button"
            class="group flex flex-1 flex-col items-stretch border-0 bg-transparent p-0 px-px sm:px-0.5 cursor-default rounded-1 focus-visible:outline-1 focus-visible:outline-solid focus-visible:outline-ui-text"
            :class="{ 'bg-ui-border/30': activeIndex === index }"
            :aria-label="getHourLabel(hour)"
            @mouseenter="activeIndex = index"
            @focus="activeIndex = index"
          >
            <span
              class="flex items-end justify-center gap-px"
              :style="{ height: `${scale.addedHeight}px` }"
            >
              <span
                v-for="stats in hour.categories"
                :key="stats.category"
                class="w-full max-w-2 rounded-t-0.5"
                :class="SWATCH[stats.category]"
                :style="{ height: getBarHeight(stats.added, scale.maxAdded) }"
              />
            </span>

            <span aria-hidden="true" class="h-px bg-ui-border" />

            <!-- Deleted -->
            <span
              class="flex items-start justify-center gap-px"
              :style="{ height: `${scale.deletedHeight}px` }"
            >
              <span
                v-for="stats in hour.categories"
                :key="stats.category"
                class="w-full max-w-2 rounded-b-0.5 opacity-55"
                :class="SWATCH[stats.category]"
                :style="{
                  height: getBarHeight(stats.deleted, scale.maxDeleted),
                }"
              />
            </span>

            <span
              aria-hidden="true"
              class="mt-1.5 h-3 text-center text-[10px] leading-none text-ui-muted"
            >
              <template v-if="isTickVisible(index)">{{ hour.label }}</template>
            </span>
          </button>
        </div>
      </div>

      <div
        v-if="activeHour"
        class="mt-4 rounded-2 border-1 border-solid border-ui-border/60 px-3 py-2.5 text-sm"
        aria-live="polite"
      >
        <p class="text-xs text-ui-muted">
          {{ dayjs(activeHour.iso).format('ddd, MMM D • HH:mm') }}
        </p>
        <table class="mt-1 w-full tabular-nums">
          <thead class="text-xs text-ui-muted">
            <tr>
              <th class="text-left font-normal">Classification</th>
              <th class="text-right font-normal">PRs</th>
              <th class="text-right font-normal">Added</th>
              <th class="text-right font-normal">Deleted</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stats in activeHour.categories" :key="stats.category">
              <td class="flex items-center gap-2 text-ui-text">
                <span
                  aria-hidden="true"
                  class="h-2 w-2 shrink-0 rounded-full"
                  :class="SWATCH[stats.category]"
                />
                {{ stats.name }}
              </td>
              <td class="text-right text-ui-muted">{{ stats.prs }}</td>
              <td class="text-right text-ui-text">
                {{ formatLines(stats.added, '+') }}
              </td>
              <td class="text-right text-ui-text">
                {{ formatLines(stats.deleted, '−') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ClientOnly>
  </div>
</template>
