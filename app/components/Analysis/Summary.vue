<script setup lang="ts">
import type { ClassificationLabel } from '@unveil/identity'
import type { RepoEvent } from '~/utils/repo-activity'

const props = defineProps<{
  classification: ClassificationLabel | undefined
  events: RepoEvent[]
  eventsCount: number
  rawEventsUrl: string
  warnings: string[]
  hasActivityReport: boolean
  compact?: boolean
}>()

const hasEventBreakdown = computed<boolean>(() => {
  return groupEventsByRepo(props.events).length > 0
})

const hasActivityBreakdown = computed<boolean>(() => {
  return props.events.length > 0 && props.classification !== 'insufficient-data'
})

const { classificationDetails } = useClassificationDetails(
  () => props.classification,
)
const { classificationIcon } = useClassificationIcons(
  () => props.classification,
)

const { scoreStyle } = useScoreStyle(
  () => props.classification,
  () => ({ hasActivityReport: props.hasActivityReport }),
)
</script>

<template>
  <div>
    <header class="flex items-center justify-between mb-2">
      <div class="w-full">
        <div class="mb-2 flex flex-col">
          <div
            v-if="warnings.length && !compact"
            class="flex items-start gap-2 text-sm text-ui-muted mb-2"
          >
            <span class="i-lucide:info text-xs shrink-0" aria-hidden="true" />
            <ul class="flex flex-col gap-1">
              <li
                v-for="(warning, i) in warnings"
                :key="i"
                class="text-pretty line-height-none"
              >
                {{ warning }}
              </li>
            </ul>
          </div>

          <div class="flex flex-wrap gap-2 items-center">
            <div class="flex gap-2 items-center" :class="scoreStyle.text">
              <span
                :class="classificationIcon"
                class="text-base"
                aria-hidden="true"
              />
              <h3 class="text-xl font-mono">
                {{ classificationDetails.label }}
              </h3>
            </div>
          </div>
        </div>
        <p class="mt-1 text-ui-text">
          {{ classificationDetails.description }}
        </p>
        <ul
          v-if="warnings.length && compact"
          class="mt-2 flex flex-col gap-1 text-sm text-ui-muted"
        >
          <li v-for="(warning, i) in warnings" :key="i" class="text-pretty">
            {{ warning }}
          </li>
        </ul>
      </div>
    </header>

    <div
      v-if="hasEventBreakdown || hasActivityBreakdown"
      class="mt-4 flex flex-col gap-2"
    >
      <AnalysisRepoActivityDisclosure
        v-if="hasEventBreakdown"
        :events
        :raw-events-url
      />
      <AnalysisActivityBreakdownDisclosure
        v-if="hasActivityBreakdown"
        :events
      />
    </div>

    <p class="mt-3 text-sm text-ui-muted">
      <template v-if="eventsCount > 0">
        Analyzed from the last {{ eventsCount }} public GitHub events
      </template>
      <template v-else>No recent events from this account</template>
    </p>
  </div>
</template>
