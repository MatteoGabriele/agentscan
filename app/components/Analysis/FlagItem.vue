<script setup lang="ts">
import type { IdentifyFlag } from '@unveil/identity'

const props = defineProps<{
  flag: IdentifyFlag
}>()

const { parseDataPoint, groupDataPoints } = useFlagDataPoints()

const isExpanded = ref(false)

function toggleExpanded() {
  if (props.flag.data.length) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<template>
  <li class="not-last:border-b border-gh-border-light/40 py-4">
    <button
      class="flex text-left items-center gap-2 mb-1 flex-wrap"
      @click="toggleExpanded"
    >
      <span class="font-mono">{{ flag.label }}</span>
      <span
        v-if="flag.data.length"
        class="i-lucide:chevron-down text-sm text-gh-muted transition-transform mt-0.5 shrink-0 ml-auto"
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

        <AnalysisFlagEvidence v-if="flag.events.length" :flag />
      </div>
    </template>
  </li>
</template>
