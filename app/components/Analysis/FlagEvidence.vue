<script setup lang="ts">
import type { IdentifyFlag } from "@unveil/identity";

const props = defineProps<{
  flag: IdentifyFlag;
}>();

const {
  getEventDescription,
  getEventUrl,
  getEventIcon,
  formatEventTime,
  groupEvents,
  sortByTime,
} = useGitHubEventDisplay();

const showAllEvidence = ref(false);

const hasConnections = computed(() => {
  return (props.flag.connections?.length ?? 0) > 0;
});
const isMixedTypes = computed(() => {
  return new Set(props.flag.events.map((e) => e.type)).size > 1;
});

const sortedEvents = computed(() => sortByTime(props.flag.events));

const PREVIEW_COUNT = 5;

const visibleConnections = computed(() => {
  const conns = props.flag.connections ?? [];
  return showAllEvidence.value ? conns : conns.slice(0, PREVIEW_COUNT);
});

const visibleSortedEvents = computed(() => {
  return showAllEvidence.value
    ? sortedEvents.value
    : sortedEvents.value.slice(0, PREVIEW_COUNT);
});

const hiddenCount = computed(() => {
  if (hasConnections.value) {
    return (
      (props.flag.connections?.length ?? 0) - visibleConnections.value.length
    );
  }

  return sortedEvents.value.length - visibleSortedEvents.value.length;
});
</script>

<template>
  <div class="pt-2 border-t border-gh-border-light/20 space-y-3">
    <p class="text-gh-muted text-xs">Evidence</p>

    <!-- ── CONNECTED PAIRS (branch→PR, fork→PR) ─────────────── -->
    <template v-if="hasConnections">
      <div class="space-y-4">
        <div v-for="(conn, i) in visibleConnections" :key="i">
          <!-- from event -->
          <div class="flex gap-3">
            <div class="flex flex-col items-center shrink-0">
              <span
                :class="getEventIcon(conn.from)"
                class="text-xs text-gh-muted"
              />
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
                {{ conn.from.repo?.name?.split("/")[1] }} ·
                {{ formatEventTime(conn.from.created_at) }}
              </p>
            </div>
          </div>

          <!-- to event -->
          <div class="flex gap-3">
            <span
              :class="getEventIcon(conn.to)"
              class="text-xs text-gh-muted shrink-0"
            />
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
                {{ conn.to.repo?.name?.split("/")[1] }} ·
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
        {{ showAllEvidence ? "Show less" : `Show ${hiddenCount} more pairs` }}
      </button>
    </template>

    <!-- ── GROUPED CARD (mixed event types forming a pattern) ── -->
    <template v-else-if="isMixedTypes">
      <div class="rounded-lg border border-gh-border-light/30 overflow-hidden">
        <div class="divide-y divide-gh-border-light/15">
          <div
            v-for="(ev, i) in visibleSortedEvents"
            :key="i"
            class="flex gap-2.5 px-3 py-2"
          >
            <span
              :class="getEventIcon(ev)"
              class="text-xs text-gh-muted shrink-0 mt-0.5"
            />
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
                {{ ev.repo?.name?.split("/")[1] }} ·
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
        {{ showAllEvidence ? "Show less" : `Show ${hiddenCount} more` }}
      </button>
    </template>

    <!-- ── ORIGINAL icon+sticky list (single event type) ── -->
    <template v-else>
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
          <div
            v-for="(ev, j) in group.events"
            :key="j"
            class="flex flex-col gap-0.5"
          >
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
        {{ showAllEvidence ? "Show less" : `Show ${hiddenCount} more` }}
      </button>
    </template>
  </div>
</template>
