<script setup lang="ts">
const { data, status, error } = useScan();

definePageMeta({
  layout: false,
});
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto">
    <div
      v-if="status === 'pending'"
      class="text-center text-gray-500 dark:text-gray-400"
    >
      loading data...
    </div>
    <div v-else-if="data" class="space-y-1">
      <div class="max-w-[300px] mx-auto">
        <ChartGlobalScoreGauge :data />
      </div>

      <!-- Aggregated categories through time: very nice to see the evolution of organic / mixed / automated -->
      <ChartGlobalStatusTimeline :data />
    </div>
    <div v-else-if="error" class="text-red-600 dark:text-red-400 text-sm">
      {{ error.message }}
    </div>
  </div>
</template>
