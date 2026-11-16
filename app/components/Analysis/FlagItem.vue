<script setup lang="ts">
import type { ReportFlag } from '@unveil/identity/report'

const props = defineProps<{
  flag: ReportFlag
}>()

const { parseDataPoint, groupDataPoints } = useFlagDataPoints()

const isExpandable = computed<boolean>(() => props.flag.data.length > 0)
</script>

<template>
  <li class="not-last:border-b border-ui-border-subtle/15">
    <CommonDisclosureRow
      :expandable="isExpandable"
      summary-class="w-full items-start gap-3 py-4"
      panel-class="pl-4 mb-5 border-l border-ui-border-subtle/20 space-y-3"
    >
      <template #summary>
        <div class="min-w-0 flex-1">
          <span
            class="font-mono text-sm text-ui-text/90 underline decoration-transparent underline-offset-4 transition-colors"
            :class="
              isExpandable &&
              'group-hover:text-ui-text group-hover:decoration-ui-border-subtle'
            "
          >
            {{ flag.label }}
          </span>
          <p
            class="text-ui-muted text-sm text-pretty mt-1 transition-colors"
            :class="isExpandable && 'group-hover:text-ui-text/75'"
          >
            {{ flag.detail }}
          </p>
        </div>
      </template>

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
    </CommonDisclosureRow>
  </li>
</template>
