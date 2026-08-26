<script setup lang="ts">
import type { IdentifyFlag } from '@unveil/identity'

const props = defineProps<{
  flag: IdentifyFlag
}>()

const { parseDataPoint, groupDataPoints } = useFlagDataPoints()

const isExpanded = ref(false)

const isExpandable = computed<boolean>(() => props.flag.data.length > 0)

function toggleExpanded() {
  if (isExpandable.value) {
    isExpanded.value = !isExpanded.value
  }
}
</script>

<template>
  <li class="not-last:border-b border-ui-border-subtle/15">
    <button
      class="group w-full flex items-start gap-3 text-left py-3.5"
      :class="isExpandable ? 'cursor-pointer' : 'cursor-default'"
      :aria-expanded="isExpandable ? isExpanded : undefined"
      @click="toggleExpanded"
    >
      <div class="min-w-0 flex-1">
        <span
          class="font-mono text-sm text-ui-text/90 transition-colors"
          :class="isExpandable && 'group-hover:text-ui-text'"
        >
          {{ flag.label }}
        </span>
        <p class="text-ui-muted text-sm text-pretty mt-0.5">
          {{ flag.detail }}
        </p>
      </div>
      <span
        v-if="isExpandable"
        class="i-lucide:chevron-down text-sm text-ui-muted/50 group-hover:text-ui-muted transition-all mt-0.5 shrink-0"
        :class="isExpanded && 'rotate-180'"
      />
    </button>

    <div
      v-if="isExpandable && isExpanded"
      class="pl-4 pb-4 border-l border-ui-border-subtle/20 space-y-3"
    >
      <div
        v-for="(group, i) in groupDataPoints(flag.data)"
        :key="`${group.icon}-${i}`"
        class="flex gap-2"
      >
        <span
          :class="group.icon"
          class="text-xs text-ui-muted shrink-0 sticky top-4 self-start mt-1"
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
                      : 'i-lucide:x text-ui-muted'
                  "
                  class="text-xs"
                />
              </template>
              <span v-else class="text-sm text-ui-muted">
                {{ parseDataPoint(point).displayValue }}
              </span>
              <span
                v-if="parseDataPoint(point).displayThreshold !== undefined"
                class="text-ui-muted text-sm"
              >
                / {{ parseDataPoint(point).displayThreshold }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <LazyAnalysisFlagEvidence v-if="flag.events.length" :flag />
    </div>
  </li>
</template>
