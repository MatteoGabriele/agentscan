<script setup lang="ts">
import type { PullRequestRowData } from '~~/shared/types/scan'

defineProps<{
  rows: PullRequestRowData[]
  /** Id of the section heading that names the list. */
  labelledby: string
  /** When set, renders that many skeleton rows instead of `rows`. */
  placeholderCount?: number
}>()
</script>

<template>
  <ul
    :aria-labelledby="labelledby"
    class="rounded-lg border border-ui-border/45 bg-ui-card divide-y divide-ui-border/25"
  >
    <template v-if="placeholderCount">
      <RepoPullRequestRowSkeleton v-for="n in placeholderCount" :key="n" />
    </template>
    <template v-else>
      <RepoPullRequestRow v-for="row in rows" :key="row.url" v-bind="row" />
    </template>
  </ul>
</template>
