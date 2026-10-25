<script setup lang="ts">
import type { ExplainedFlag } from '@unveil/identity/explain'
import type { IntegrationItem } from '~~/shared/types/integrations'

defineProps<{
  flags: ExplainedFlag[]
  activityReport: IntegrationItem | undefined
}>()
</script>

<template>
  <section class="bg-ui-card rounded-2 px-6 py-5">
    <header class="flex items-baseline gap-2">
      <h3 class="text-ui-text text-lg font-mono">Activity signals</h3>
      <span v-if="flags.length" class="text-ui-muted text-sm">
        {{ flags.length }}
      </span>
    </header>

    <ul v-if="flags.length" class="mt-1">
      <AnalysisFlagItem v-for="flag in flags" :key="flag.id" :flag="flag" />
    </ul>

    <LazyExternalAnlysisCard
      v-if="activityReport"
      :items="[activityReport]"
      class="mt-4"
    />
  </section>
</template>
