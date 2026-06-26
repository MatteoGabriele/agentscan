<script setup lang="ts">
import type { IdentifyResult } from "@unveil/identity";
import type { IntegrationItem } from "~~/shared/types/integrations";

defineProps<{
  flags: IdentifyResult["flags"];
  activityReport: IntegrationItem | undefined;
}>();
</script>

<template>
  <div class="bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border">
    <h3 class="mb-4 text-gh-text text-xl font-mono">Activity Signals</h3>
    <ul>
      <AnalysisFlagItem v-for="flag in flags" :key="flag.label" :flag="flag" />
    </ul>

    <ExternalAnlysisCard
      v-if="activityReport"
      :items="[activityReport]"
      class="mt-4"
    />
  </div>
</template>
