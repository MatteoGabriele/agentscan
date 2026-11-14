<script setup lang="ts">
import type { ActivityCategory } from '~~/shared/types/activity'
import {
  CLASSIFICATIONS_WITH_NAME_AND_CATEGORY,
  SWATCH,
} from '~~/shared/utils/charts'
import {
  COMMUNITY_REPORTED_NAME,
  INSUFFICIENT_ACTIVITY_NAME,
} from '~~/shared/utils/scan-pull-requests'

defineProps<{
  counts: Record<ActivityCategory, number>
  /** Accounts without enough activity, listed apart from the groups. */
  insufficient?: number
  /** Community-reported accounts, listed apart from the groups too. */
  communityReported?: number
}>()
</script>

<template>
  <ul class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
    <li
      v-for="{ name, category } in CLASSIFICATIONS_WITH_NAME_AND_CATEGORY"
      :key="category"
      class="flex items-center gap-2"
    >
      <span
        :class="SWATCH[category]"
        class="size-2 block rounded-full"
        aria-hidden="true"
      />
      {{ name }}
      <span class="text-ui-muted tabular-nums">{{ counts[category] }}</span>
    </li>
    <li
      v-if="insufficient"
      class="flex items-center gap-2 text-ui-muted sm:ml-auto"
    >
      <span class="i-lucide:circle-slash text-xs shrink-0" aria-hidden="true" />
      {{ INSUFFICIENT_ACTIVITY_NAME }}
      <span class="tabular-nums">{{ insufficient }}</span>
    </li>
    <li
      v-if="communityReported"
      class="flex items-center gap-2 text-ui-muted"
      :class="{ 'sm:ml-auto': !insufficient }"
    >
      <span class="i-lucide:users text-xs shrink-0" aria-hidden="true" />
      {{ COMMUNITY_REPORTED_NAME }}
      <span class="tabular-nums">{{ communityReported }}</span>
    </li>
  </ul>
</template>
