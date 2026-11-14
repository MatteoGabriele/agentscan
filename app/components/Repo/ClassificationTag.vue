<script setup lang="ts">
import type { ClassificationLabel } from '@unveil/identity'
import { CLASSIFICATION_NAMES } from '~~/shared/utils/charts'
import {
  COMMUNITY_REPORTED_NAME,
  INSUFFICIENT_ACTIVITY_NAME,
} from '~~/shared/utils/scan-pull-requests'

const props = defineProps<{
  classification: ClassificationLabel
  communityReported?: boolean
}>()

const { classificationIcon } = useClassificationIcons(
  () => props.classification,
)

const { scoreStyle } = useScoreStyle(
  () => props.classification,
  () => ({ hasCommunityFlag: props.communityReported }),
)

const label = computed<string>(() => {
  if (props.communityReported) {
    return COMMUNITY_REPORTED_NAME
  }

  return props.classification === 'insufficient-data'
    ? INSUFFICIENT_ACTIVITY_NAME
    : CLASSIFICATION_NAMES[props.classification]
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 text-sm font-mono"
    :class="scoreStyle.text"
  >
    <span :class="classificationIcon" class="shrink-0" aria-hidden="true" />
    {{ label }}
  </span>
</template>
