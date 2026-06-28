<script setup lang="ts">
import type { IdentifyFlag } from '@unveil/identity'

const props = defineProps<{
  flag: IdentifyFlag
}>()

const {
  getEventDescription,
  getEventUrl,
  getEventIcon,
  formatEventTime,
  groupEvents,
  sortByTime,
  getDeltaSeconds,
  formatSpan,
} = useGitHubEventDisplay()

const showAllEvidence = ref(false)

const hasConnections = computed(() => {
  return (props.flag.connections?.length ?? 0) > 0
})
const isMixedTypes = computed(() => {
  return new Set(props.flag.events.map((e) => e.type)).size > 1
})

const sortedEvents = computed(() => sortByTime(props.flag.events))

const PREVIEW_COUNT = 5
const FAST_THRESHOLD_SECONDS = 300

const fastestConnection = computed(() => {
  if (!hasConnections.value) {
    return null
  }

  const conns = props.flag.connections ?? []

  let best: (typeof conns)[0] | null = null
  let minDelta = Infinity

  for (const conn of conns) {
    if (!conn.from.created_at || !conn.to.created_at) {
      continue
    }

    const delta = Math.abs(getDeltaSeconds(conn.from, conn.to))

    if (delta < minDelta) {
      minDelta = delta
      best = conn
    }
  }
  return best && minDelta < FAST_THRESHOLD_SECONDS ? { conn: best, delta: minDelta } : null
})

const fastestEventPair = computed(() => {
  if (hasConnections.value) {
    return null
  }

  const sorted = sortedEvents.value

  if (sorted.length < 2) {
    return null
  }

  let bestA = null
  let bestB = null
  let minDelta = Infinity

  for (let i = 0; i < sorted.length - 1; i++) {
    const currValue = sorted[i]
    const nextValue = sorted[i + 1]

    if (!currValue?.created_at || !nextValue?.created_at) {
      continue
    }

    const delta = getDeltaSeconds(currValue, nextValue)
    if (delta >= 0 && delta < minDelta) {
      minDelta = delta
      bestA = sorted[i]
      bestB = sorted[i + 1]
    }
  }

  return bestA && bestB && minDelta < FAST_THRESHOLD_SECONDS
    ? { a: bestA, b: bestB, delta: minDelta }
    : null
})

const visibleConnections = computed(() => {
  const conns = props.flag.connections ?? []
  return showAllEvidence.value ? conns : conns.slice(0, PREVIEW_COUNT)
})

const visibleSortedEvents = computed(() => {
  return showAllEvidence.value ? sortedEvents.value : sortedEvents.value.slice(0, PREVIEW_COUNT)
})

const hiddenCount = computed(() => {
  if (hasConnections.value) {
    return (props.flag.connections?.length ?? 0) - visibleConnections.value.length
  }

  return sortedEvents.value.length - visibleSortedEvents.value.length
})
</script>

<template>
  <div class="pt-2 border-t border-gh-border-light/20 space-y-3">
    <p class="text-gh-muted text-xs">Evidence</p>

    <!-- ── CONNECTED PAIRS (branch→PR, fork→PR) ─────────────── -->
    <template v-if="hasConnections">
      <AnalysisFlagEvidenceFast
        v-if="fastestConnection"
        :time="formatSpan(fastestConnection.delta)"
      >
        <div class="flex flex-col gap-1">
          <div class="flex gap-3">
            <div class="flex flex-col items-center shrink-0">
              <span
                :class="getEventIcon(fastestConnection.conn.from)"
                class="text-xs text-gh-muted"
              />
              <div class="w-px flex-1 bg-gh-danger-hover/30 my-1" />
            </div>
            <div class="min-w-0 pb-1">
              <a
                v-if="getEventUrl(fastestConnection.conn.from)"
                :href="getEventUrl(fastestConnection.conn.from)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gh-text hover:underline inline-flex items-center gap-1"
              >
                {{ getEventDescription(fastestConnection.conn.from) }}
                <span
                  class="i-lucide:external-link text-gh-muted opacity-60 shrink-0"
                  style="font-size: 0.6rem"
                />
              </a>
              <p v-else class="text-sm text-gh-text">
                {{ getEventDescription(fastestConnection.conn.from) }}
              </p>
              <p class="text-xs text-gh-muted">
                {{ formatEventTime(fastestConnection.conn.from.created_at) }}
              </p>
            </div>
          </div>
          <div class="flex gap-3">
            <span
              :class="getEventIcon(fastestConnection.conn.to)"
              class="text-xs text-gh-muted shrink-0"
            />
            <div class="min-w-0">
              <a
                v-if="getEventUrl(fastestConnection.conn.to)"
                :href="getEventUrl(fastestConnection.conn.to)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gh-text hover:underline inline-flex items-center gap-1"
              >
                {{ getEventDescription(fastestConnection.conn.to) }}
                <span
                  class="i-lucide:external-link text-gh-muted opacity-60 shrink-0"
                  style="font-size: 0.6rem"
                />
              </a>
              <p v-else class="text-sm text-gh-text">
                {{ getEventDescription(fastestConnection.conn.to) }}
              </p>
              <p class="text-xs text-gh-muted">
                {{ formatEventTime(fastestConnection.conn.to.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </AnalysisFlagEvidenceFast>

      <div class="space-y-4">
        <div v-for="(conn, i) in visibleConnections" :key="i">
          <!-- from event -->
          <div class="flex gap-3">
            <div class="flex flex-col items-center shrink-0">
              <span :class="getEventIcon(conn.from)" class="text-xs text-gh-muted" />
              <!-- vertical connector line -->
              <div class="w-px flex-1 bg-gh-border-light/40 my-1" />
            </div>
            <div class="min-w-0 pb-2">
              <a
                v-if="getEventUrl(conn.from)"
                :href="getEventUrl(conn.from)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gh-text hover:underline inline-flex items-center gap-1"
              >
                {{ getEventDescription(conn.from) }}
                <span
                  class="i-lucide:external-link text-gh-muted opacity-60 shrink-0"
                  style="font-size: 0.6rem"
                />
              </a>
              <p v-else class="text-sm text-gh-text">
                {{ getEventDescription(conn.from) }}
              </p>
              <p class="text-xs text-gh-muted">
                {{ conn.from.repo?.name?.split('/')[1] }} ·
                {{ formatEventTime(conn.from.created_at) }}
              </p>
            </div>
          </div>

          <!-- to event -->
          <div class="flex gap-3">
            <span :class="getEventIcon(conn.to)" class="text-xs text-gh-muted shrink-0" />
            <div class="min-w-0">
              <a
                v-if="getEventUrl(conn.to)"
                :href="getEventUrl(conn.to)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gh-text hover:underline inline-flex items-center gap-1"
              >
                {{ getEventDescription(conn.to) }}
                <span
                  class="i-lucide:external-link text-gh-muted opacity-60 shrink-0"
                  style="font-size: 0.6rem"
                />
              </a>
              <p v-else class="text-sm text-gh-text">
                {{ getEventDescription(conn.to) }}
              </p>
              <p class="text-xs text-gh-muted">
                {{ conn.to.repo?.name?.split('/')[1] }} ·
                {{ formatEventTime(conn.to.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="hiddenCount > 0 || showAllEvidence"
        class="text-gh-muted text-xs hover:text-gh-text transition-colors"
        @click="showAllEvidence = !showAllEvidence"
      >
        {{ showAllEvidence ? 'Show less' : `Show ${hiddenCount} more pairs` }}
      </button>
    </template>

    <!-- ── GROUPED CARD (mixed event types forming a pattern) ── -->
    <template v-else-if="isMixedTypes">
      <!-- fastest event pair callout -->

      <AnalysisFlagEvidenceFast v-if="fastestEventPair" :time="formatSpan(fastestEventPair.delta)">
        <div class="space-y-1">
          <div
            v-for="ev in [fastestEventPair.a, fastestEventPair.b]"
            :key="ev.id"
            class="flex gap-2.5"
          >
            <span :class="getEventIcon(ev)" class="text-xs text-gh-muted shrink-0 mt-0.5" />
            <div class="min-w-0">
              <a
                v-if="getEventUrl(ev)"
                :href="getEventUrl(ev)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gh-text hover:underline inline-flex items-center gap-1"
              >
                {{ getEventDescription(ev) }}
                <span
                  class="i-lucide:external-link text-gh-muted opacity-60"
                  style="font-size: 0.6rem"
                />
              </a>
              <p v-else class="text-sm text-gh-text">{{ getEventDescription(ev) }}</p>
              <p class="text-xs text-gh-muted">
                {{ ev.repo?.name?.split('/')[1] }} · {{ formatEventTime(ev.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </AnalysisFlagEvidenceFast>

      <div class="rounded-lg border border-gh-border-light/30 overflow-hidden">
        <div class="divide-y divide-gh-border-light/15">
          <div v-for="(ev, i) in visibleSortedEvents" :key="i" class="flex gap-2.5 px-3 py-2">
            <span :class="getEventIcon(ev)" class="text-xs text-gh-muted shrink-0 mt-0.5" />
            <div class="min-w-0 flex-1">
              <a
                v-if="getEventUrl(ev)"
                :href="getEventUrl(ev)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-gh-text hover:underline inline-flex items-center gap-1"
              >
                {{ getEventDescription(ev) }}
                <span
                  class="i-lucide:external-link text-gh-muted opacity-60"
                  style="font-size: 0.6rem"
                />
              </a>
              <p v-else class="text-sm text-gh-text">
                {{ getEventDescription(ev) }}
              </p>
              <p class="text-xs text-gh-muted">
                {{ ev.repo?.name?.split('/')[1] }} ·
                {{ formatEventTime(ev.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="hiddenCount > 0 || showAllEvidence"
        class="text-gh-muted text-xs hover:text-gh-text transition-colors"
        @click="showAllEvidence = !showAllEvidence"
      >
        {{ showAllEvidence ? 'Show less' : `Show ${hiddenCount} more` }}
      </button>
    </template>

    <!-- ── ORIGINAL icon+sticky list (single event type) ── -->
    <template v-else>
      <AnalysisFlagEvidenceFast v-if="fastestEventPair" :time="formatSpan(fastestEventPair.delta)">
        <div class="space-y-1">
          <div
            v-for="ev in [fastestEventPair.a, fastestEventPair.b]"
            :key="ev.id"
            class="flex gap-2"
          >
            <span :class="getEventIcon(ev)" class="text-xs text-gh-muted shrink-0 mt-0.5" />
            <div class="flex-1 flex flex-col gap-0.5">
              <a
                v-if="getEventUrl(ev)"
                :href="getEventUrl(ev)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gh-text text-sm hover:underline inline-flex items-center gap-1"
              >
                {{ getEventDescription(ev) }}
                <span
                  class="i-lucide:external-link text-gh-muted opacity-60"
                  style="font-size: 0.6rem"
                />
              </a>
              <span v-else class="text-gh-text text-sm">{{ getEventDescription(ev) }}</span>
              <div class="flex gap-2 text-gh-muted text-xs">
                <span>{{ ev.repo?.name }}</span>
                <span>{{ formatEventTime(ev.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </AnalysisFlagEvidenceFast>

      <div
        v-for="(group, i) in groupEvents(visibleSortedEvents)"
        :key="`${group.icon}-${i}`"
        class="flex gap-2"
      >
        <span
          :class="group.icon"
          class="text-xs text-gh-muted shrink-0 sticky top-4 self-start mt-1"
        />
        <div class="flex-1 space-y-3">
          <div v-for="(ev, j) in group.events" :key="j" class="flex flex-col gap-0.5">
            <a
              v-if="getEventUrl(ev)"
              :href="getEventUrl(ev)"
              target="_blank"
              rel="noopener noreferrer"
              class="text-gh-text text-sm hover:underline inline-flex items-center gap-1"
            >
              {{ getEventDescription(ev) }}
              <span
                class="i-lucide:external-link text-gh-muted opacity-60"
                style="font-size: 0.6rem"
              />
            </a>
            <span v-else class="text-gh-text text-sm">
              {{ getEventDescription(ev) }}
            </span>
            <div class="flex gap-2 text-gh-muted text-xs">
              <span>{{ ev.repo?.name }}</span>
              <span>{{ formatEventTime(ev.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="hiddenCount > 0 || showAllEvidence"
        class="text-gh-muted text-xs hover:text-gh-text transition-colors"
        @click="showAllEvidence = !showAllEvidence"
      >
        {{ showAllEvidence ? 'Show less' : `Show ${hiddenCount} more` }}
      </button>
    </template>
  </div>
</template>
