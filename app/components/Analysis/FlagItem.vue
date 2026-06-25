<script setup lang="ts">
import type { IdentifyResult } from "@unveil/identity";

type Flag = IdentifyResult["flags"][number];

const props = defineProps<{ flag: Flag }>();

const { isExceeded, parseDataPoint, groupDataPoints } = useFlagDataPoints();
const { getEventDescription, getEventUrl, formatEventTime, groupEvents } =
  useGitHubEventDisplay();

const isExpanded = ref(false);
const areEventsExpanded = ref(false);

function toggleExpanded() {
  if (props.flag.data.length) isExpanded.value = !isExpanded.value;
}

function toggleEvents() {
  areEventsExpanded.value = !areEventsExpanded.value;
}

const EVENT_PREVIEW_COUNT = 5;

const visibleEvents = computed(() =>
  areEventsExpanded.value
    ? props.flag.events
    : props.flag.events.slice(0, EVENT_PREVIEW_COUNT),
);
</script>

<template>
  <li class="not-last:border-b border-gh-border-light/40 py-4">
    <button class="flex items-center gap-1 mb-1" @click="toggleExpanded">
      <h4 class="font-mono">{{ flag.label }}</h4>
      <span
        v-if="flag.data.length"
        class="i-lucide:chevron-down text-sm text-gh-muted transition-transform mt-0.5 shrink-0"
        :class="isExpanded && 'rotate-180'"
      />
    </button>
    <p class="text-gh-muted text-sm">{{ flag.detail }}</p>

    <template v-if="flag.data.length">
      <div
        v-if="isExpanded"
        class="mt-3 pt-3 border-t border-gh-border-light/30 space-y-2"
      >
        <div
          v-for="(group, i) in groupDataPoints(flag.data)"
          :key="`${group.icon}-${i}`"
          class="flex gap-2"
        >
          <span
            :class="group.icon"
            class="text-xs text-gh-muted shrink-0 sticky top-4 self-start mt-1"
          />
          <div class="flex-1 space-y-3">
            <div
              v-for="point in group.points"
              :key="point.label"
              class="flex flex-col gap-0.5"
            >
              <span class="text-sm">{{ parseDataPoint(point).label }}</span>
              <div class="flex items-center gap-1">
                <template v-if="typeof point.value === 'boolean'">
                  <span
                    :class="
                      point.value
                        ? 'i-lucide:check text-green-500'
                        : 'i-lucide:x text-gh-muted'
                    "
                    class="text-xs"
                  />
                </template>
                <span v-else class="text-sm text-gh-muted">
                  {{ parseDataPoint(point).displayValue }}
                </span>
                <span
                  v-if="parseDataPoint(point).displayThreshold !== undefined"
                  class="text-gh-muted text-sm"
                >
                  / {{ parseDataPoint(point).displayThreshold }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <template v-if="flag.events.length">
          <p
            class="text-gh-muted text-xs pt-2 pb-1 border-t border-gh-border-light/20"
          >
            Evidence
          </p>
          <div
            v-for="(group, i) in groupEvents(visibleEvents)"
            :key="`${group.icon}-${i}`"
            class="flex gap-2"
          >
            <span
              :class="group.icon"
              class="text-xs text-gh-muted shrink-0 sticky top-4 self-start mt-1"
            />
            <div class="flex-1 space-y-3">
              <div
                v-for="(ev, i) in group.events"
                :key="i"
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
                  <span class="i-lucide:external-link text-gh-muted opacity-60" style="font-size:0.6rem" />
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
            v-if="flag.events.length > EVENT_PREVIEW_COUNT"
            class="text-gh-muted text-xs hover:text-gh-text transition-colors"
            @click="toggleEvents"
          >
            {{
              areEventsExpanded
                ? "Show less"
                : `Show ${flag.events.length - EVENT_PREVIEW_COUNT} more`
            }}
          </button>
        </template>
      </div>
    </template>
  </li>
</template>
