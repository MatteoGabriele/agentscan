<script setup lang="ts">
import type { IdentifyEvent } from '@unveil/identity'
import type { IdentifyFlag } from '@unveil/identity/report'
import type { GitHubEvent } from '@unveil/identity/providers/github'

const props = defineProps<{
  flag: IdentifyFlag
}>()

// Flag events are provider-neutral; the raw GitHub event they came from is
// kept on `source`, which is what the links and descriptions below read.
function toGitHubEvent(event: IdentifyEvent): GitHubEvent | undefined {
  return event.source as GitHubEvent | undefined
}

const events = computed<GitHubEvent[]>(() => {
  return props.flag.events.flatMap((e) => toGitHubEvent(e) ?? [])
})

const connections = computed(() => {
  return (props.flag.connections ?? []).flatMap((conn) => {
    const from = toGitHubEvent(conn.from)
    const to = toGitHubEvent(conn.to)
    return from && to ? [{ from, to, label: conn.label }] : []
  })
})

const {
  getEventIcon,
  formatEventTime,
  groupEvents,
  sortByTime,
  getDeltaSeconds,
  formatSpan,
} = useGitHubEventDisplay()

const showAllEvidence = ref(false)

const hasConnections = computed(() => {
  return connections.value.length > 0
})
const isMixedTypes = computed(() => {
  return new Set(events.value.map((e) => e.type)).size > 1
})

const sortedEvents = computed(() => sortByTime(events.value))

const PREVIEW_COUNT = 5
const FAST_THRESHOLD_SECONDS = 300

const fastestConnection = computed(() => {
  if (!hasConnections.value) {
    return null
  }

  const conns = connections.value

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
  return best && minDelta < FAST_THRESHOLD_SECONDS
    ? { conn: best, delta: minDelta }
    : null
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
  const conns = connections.value
  return showAllEvidence.value ? conns : conns.slice(0, PREVIEW_COUNT)
})

const visibleSortedEvents = computed(() => {
  return showAllEvidence.value
    ? sortedEvents.value
    : sortedEvents.value.slice(0, PREVIEW_COUNT)
})

const hiddenCount = computed(() => {
  if (hasConnections.value) {
    return connections.value.length - visibleConnections.value.length
  }

  return sortedEvents.value.length - visibleSortedEvents.value.length
})
</script>

<template>
  <div class="pt-2 border-t border-ui-border-subtle/20 space-y-3">
    <p class="text-ui-muted text-xs">Evidence</p>

    <template v-if="hasConnections">
      <LazyAnalysisFlagEvidenceFast
        v-if="fastestConnection"
        :time="formatSpan(fastestConnection.delta)"
      >
        <div class="flex flex-col gap-1">
          <div class="flex gap-3">
            <div class="flex flex-col items-center shrink-0">
              <span
                :class="getEventIcon(fastestConnection.conn.from)"
                class="text-xs text-ui-muted"
              />
              <div class="w-px flex-1 bg-ui-automation/30 my-1" />
            </div>
            <div class="min-w-0 pb-1">
              <AnalysisFlagEvidenceLink :event="fastestConnection.conn.from" />
              <p class="text-xs text-ui-muted">
                {{ formatEventTime(fastestConnection.conn.from.created_at) }}
              </p>
              <AnalysisFlagEvidenceTextLink
                :event="fastestConnection.conn.from"
              />
            </div>
          </div>
          <div class="flex gap-3">
            <span
              :class="getEventIcon(fastestConnection.conn.to)"
              class="text-xs text-ui-muted shrink-0"
            />
            <div class="min-w-0">
              <AnalysisFlagEvidenceLink :event="fastestConnection.conn.to" />
              <p class="text-xs text-ui-muted">
                {{ formatEventTime(fastestConnection.conn.to.created_at) }}
              </p>
              <AnalysisFlagEvidenceTextLink
                :event="fastestConnection.conn.to"
              />
            </div>
          </div>
        </div>
      </LazyAnalysisFlagEvidenceFast>

      <div class="space-y-4">
        <div v-for="(conn, i) in visibleConnections" :key="i">
          <!-- from event -->
          <div class="flex gap-3">
            <div class="flex flex-col items-center shrink-0">
              <span
                :class="getEventIcon(conn.from)"
                class="text-xs text-ui-muted"
              />
              <!-- vertical connector line -->
              <div class="w-px flex-1 bg-ui-border-subtle/40 my-1" />
            </div>
            <div class="min-w-0 pb-2">
              <AnalysisFlagEvidenceLink :event="conn.from" />
              <p class="text-xs text-ui-muted">
                {{ formatEventTime(conn.from.created_at) }} ·
                {{ conn.from.repo?.name?.split('/')[1] }}
              </p>
              <AnalysisFlagEvidenceTextLink :event="conn.from" />
            </div>
          </div>

          <div class="flex gap-3">
            <span
              :class="getEventIcon(conn.to)"
              class="text-xs text-ui-muted shrink-0"
            />
            <div class="min-w-0">
              <AnalysisFlagEvidenceLink :event="conn.to" />
              <p class="text-xs text-ui-muted">
                {{ formatEventTime(conn.to.created_at) }} ·
                {{ conn.to.repo?.name?.split('/')[1] }}
              </p>
              <AnalysisFlagEvidenceTextLink :event="conn.to" />
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="hiddenCount > 0 || showAllEvidence"
        class="text-ui-muted text-xs hover:text-ui-text transition-colors"
        @click="showAllEvidence = !showAllEvidence"
      >
        {{ showAllEvidence ? 'Show less' : `Show ${hiddenCount} more pairs` }}
      </button>
    </template>

    <template v-else-if="isMixedTypes">
      <LazyAnalysisFlagEvidenceFast
        v-if="fastestEventPair"
        :time="formatSpan(fastestEventPair.delta)"
      >
        <div class="space-y-1">
          <div
            v-for="(ev, i) in [fastestEventPair.a, fastestEventPair.b]"
            :key="i"
            class="flex gap-2.5"
          >
            <span
              :class="getEventIcon(ev)"
              class="text-xs text-ui-muted shrink-0 mt-0.5"
            />
            <div class="min-w-0">
              <AnalysisFlagEvidenceLink :event="ev" />
              <p class="text-xs text-ui-muted">
                {{ formatEventTime(ev.created_at) }} ·
                {{ ev.repo?.name?.split('/')[1] }}
              </p>
              <AnalysisFlagEvidenceTextLink :event="ev" />
            </div>
          </div>
        </div>
      </LazyAnalysisFlagEvidenceFast>

      <div class="rounded-lg border border-ui-border-subtle/30 overflow-hidden">
        <div class="divide-y divide-ui-border-subtle/15">
          <div
            v-for="(ev, i) in visibleSortedEvents"
            :key="i"
            class="flex gap-2.5 px-3 py-2"
          >
            <span
              :class="getEventIcon(ev)"
              class="text-xs text-ui-muted shrink-0 mt-0.5"
            />
            <div class="min-w-0 flex-1">
              <AnalysisFlagEvidenceLink :event="ev" />
              <p class="text-xs text-ui-muted">
                {{ formatEventTime(ev.created_at) }} ·
                {{ ev.repo?.name?.split('/')[1] }}
              </p>
              <AnalysisFlagEvidenceTextLink :event="ev" />
            </div>
          </div>
        </div>
      </div>

      <button
        v-if="hiddenCount > 0 || showAllEvidence"
        class="text-ui-muted text-xs hover:text-ui-text transition-colors"
        @click="showAllEvidence = !showAllEvidence"
      >
        {{ showAllEvidence ? 'Show less' : `Show ${hiddenCount} more` }}
      </button>
    </template>

    <!-- ── ORIGINAL icon+sticky list (single event type) ── -->
    <template v-else>
      <LazyAnalysisFlagEvidenceFast
        v-if="fastestEventPair"
        :time="formatSpan(fastestEventPair.delta)"
      >
        <div class="space-y-1">
          <div
            v-for="(ev, i) in [fastestEventPair.a, fastestEventPair.b]"
            :key="i"
            class="flex gap-2"
          >
            <span
              :class="getEventIcon(ev)"
              class="text-xs text-ui-muted shrink-0 mt-0.5"
            />
            <div class="flex-1 flex flex-col gap-0.5">
              <AnalysisFlagEvidenceLink :event="ev" />
              <div class="flex gap-2 text-ui-muted text-xs">
                <span>{{ formatEventTime(ev.created_at) }}</span>
                <span>{{ ev.repo?.name }}</span>
              </div>
              <AnalysisFlagEvidenceTextLink :event="ev" />
            </div>
          </div>
        </div>
      </LazyAnalysisFlagEvidenceFast>

      <div
        v-for="(group, i) in groupEvents(visibleSortedEvents)"
        :key="`${group.icon}-${i}`"
        class="flex gap-2"
      >
        <span
          :class="group.icon"
          class="text-xs text-ui-muted shrink-0 sticky top-4 self-start mt-1"
        />
        <div class="flex-1 space-y-3">
          <div
            v-for="(ev, j) in group.events"
            :key="j"
            class="flex flex-col gap-0.5"
          >
            <AnalysisFlagEvidenceLink :event="ev" />
            <div class="flex gap-2 text-ui-muted text-xs">
              <span>{{ formatEventTime(ev.created_at) }}</span>
              <span>{{ ev.repo?.name }}</span>
            </div>
            <AnalysisFlagEvidenceTextLink :event="ev" />
          </div>
        </div>
      </div>

      <button
        v-if="hiddenCount > 0 || showAllEvidence"
        class="text-ui-muted text-xs hover:text-ui-text transition-colors"
        @click="showAllEvidence = !showAllEvidence"
      >
        {{ showAllEvidence ? 'Show less' : `Show ${hiddenCount} more` }}
      </button>
    </template>
  </div>
</template>
