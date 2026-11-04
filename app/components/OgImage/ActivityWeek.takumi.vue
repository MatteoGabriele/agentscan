<script setup lang="ts">
import type { ActivityCategory } from '~~/shared/types/activity'
import type { ActivityWeekSnapshot } from '~~/shared/utils/activity-week'

type CategoryValues<T> = Record<ActivityCategory, T>

// One object prop travels as a single JSON segment of the image URL, so the
// null changes (no previous week) survive the round trip.
const { week } = defineProps<{
  week: ActivityWeekSnapshot
}>()

// The renderer can't read CSS variables, so these mirror the dark theme
// tokens in app/assets/main.css.
const COLORS = {
  bg: '#0b0b0b',
  text: '#f0f0f0',
  muted: '#808080',
}

const CLASSIFICATION_COLORS: CategoryValues<string> = {
  organic: '#22c55e',
  mixed: '#e7b416',
  automation: '#cc3232',
}

const WIDTH = 1200
const HEIGHT = 630

// The chart bleeds off the left, right and bottom edges. Like the activity
// chart, it scales from 0 to the highest value, which always lands on the
// top of this band, so even a spike stays under the text.
const CHART_HEIGHT = 285
const CHART_TOP = HEIGHT - CHART_HEIGHT

const rows = computed(() =>
  (
    [
      ['organic', 'Organic'],
      ['mixed', 'Mixed'],
      ['automation', 'Automation'],
    ] as const
  ).map(([category, name]) => ({
    category,
    name,
    share: week.shares[category],
    change: week.changes[category],
  })),
)

function formatChange(change: number) {
  const value = Math.abs(change)
  const sign = change > 0 ? '+' : change < 0 ? '−' : ''

  return `${sign}${value} ${value === 1 ? 'pt' : 'pts'}`
}

function formatDay(date: string) {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

const period = computed(() => {
  const first = week.dates[0]
  const last = week.dates.at(-1)

  return first && last ? `${formatDay(first)} – ${formatDay(last)}` : ''
})

const yMax = computed(
  () =>
    Math.max(
      ...week.series.organic,
      ...week.series.mixed,
      ...week.series.automation,
      1,
    ) || 100,
)

type Point = { x: number; y: number }

function getPoints(values: number[]): Point[] {
  // A single day still spans the frame as a flat line
  const series = values.length === 1 ? [...values, ...values] : values
  const spacing = WIDTH / (series.length - 1)

  return series.map((value, index) => ({
    x: index * spacing,
    y: CHART_TOP + CHART_HEIGHT * (1 - value / yMax.value),
  }))
}

// Each day paired with the next one
function getSpans(points: Point[]) {
  return points.slice(1).flatMap((end, index) => {
    const start = points[index]

    return start ? [{ start, end }] : []
  })
}

// Monotone cubic interpolation (as in d3's curveMonotoneX): smooth, but every
// peak and dip lands exactly on its day's value, without overshooting.
function getTangents(points: Point[]) {
  const slopes = getSpans(points).map(
    ({ start, end }) => (end.y - start.y) / (end.x - start.x),
  )

  return points.map((_, index) => {
    const before = slopes[index - 1]
    const after = slopes[index]

    if (before === undefined) {
      return after ?? 0
    }

    if (after === undefined) {
      return before
    }

    if (before * after <= 0) {
      return 0
    }

    return (
      Math.sign(before) *
      Math.min(
        Math.abs(before),
        Math.abs(after),
        Math.abs(before + after) / 4,
      ) *
      2
    )
  })
}

// One cubic bézier per day-to-day segment
function getSegments(points: Point[]) {
  const tangents = getTangents(points)

  return getSpans(points).map(({ start, end }, index) => {
    const third = (end.x - start.x) / 3
    const startTangent = tangents[index] ?? 0
    const endTangent = tangents[index + 1] ?? 0

    return `C ${start.x + third} ${start.y + startTangent * third} ${end.x - third} ${end.y - endTangent * third} ${end.x} ${end.y}`
  })
}

// Organic is drawn last so it sits on top
const lines = computed(() =>
  (['automation', 'mixed', 'organic'] as const).map((category) => {
    const points = getPoints(week.series[category])
    const first = points[0]
    const line = first
      ? `M ${first.x} ${first.y} ${getSegments(points).join(' ')}`
      : ''

    return {
      category,
      color: CLASSIFICATION_COLORS[category],
      line,
      area: line ? `${line} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z` : '',
    }
  }),
)
</script>

<template>
  <div
    class="w-full h-full flex relative"
    :style="{ backgroundColor: COLORS.bg, color: COLORS.text }"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :width="WIDTH"
      :height="HEIGHT"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      :style="{ position: 'absolute', top: 0, left: 0 }"
    >
      <defs>
        <linearGradient
          v-for="series in lines"
          :id="`area-${series.category}`"
          :key="series.category"
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop offset="0%" :stop-color="series.color" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="series.color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path
        v-for="series in lines"
        :key="`area-${series.category}`"
        :d="series.area"
        :fill="`url(#area-${series.category})`"
      />
      <path
        v-for="series in lines"
        :key="`line-${series.category}`"
        :d="series.line"
        fill="none"
        :stroke="series.color"
        stroke-width="6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Sized for a link card in a social feed, shown at a third to a half
    of its size: nothing goes below 30px. The title and description render
    under the card, so the image only carries the numbers. -->
    <div
      class="w-full flex flex-col gap-10 px-14 pt-12"
      :style="{ position: 'absolute', top: 0, left: 0 }"
    >
      <div
        class="flex items-center justify-between"
        :style="{ color: COLORS.muted, fontSize: '36px' }"
      >
        <div class="flex items-center gap-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="44"
            height="44"
            viewBox="0 0 32 32"
          >
            <path
              :fill="COLORS.text"
              d="M21 29H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16v2H5v22h16Z"
            />
            <path
              :fill="COLORS.text"
              d="M15 9h2v14h-2zm12 0h2v14h-2zm-6 0h2v14h-2z"
            />
          </svg>
          <span :style="{ color: COLORS.text }">AgentScan</span>
        </div>
        <span>{{ period }}</span>
      </div>

      <div class="flex">
        <div
          v-for="row in rows"
          :key="row.category"
          class="flex flex-col gap-2"
          :style="{ width: `${100 / rows.length}%` }"
        >
          <div class="flex items-center gap-3" :style="{ fontSize: '34px' }">
            <div
              class="w-5 h-5 rounded-full"
              :style="{
                backgroundColor: CLASSIFICATION_COLORS[row.category],
              }"
            />
            <span>{{ row.name }}</span>
          </div>
          <span class="font-bold leading-none" :style="{ fontSize: '96px' }"
            >{{ row.share }}%</span
          >
          <div
            v-if="row.change !== null"
            class="flex items-center gap-2"
            :style="{ color: COLORS.muted, fontSize: '30px' }"
          >
            <span :style="{ color: COLORS.text }">{{
              formatChange(row.change)
            }}</span>
            <span>vs last week</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
