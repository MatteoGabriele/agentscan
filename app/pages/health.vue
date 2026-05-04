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
      <!-- Probably too hard to read (at least for now, but surely for the layman) so maybe you can get rid of it -->
      <ChartGlobalScatter :data />

      <!-- Aggregated categories through time: very nice to see the evolution of organic / mixed / automated -->
      <ChartGlobalStatusTimeline :data />
    </div>
    <div v-else-if="error" class="text-red-600 dark:text-red-400 text-sm">
      {{ error.message }}
    </div>

    <!-- Temporary playground: to be moved to the individual account page -->
    <p class="text-center">username</p>
    <div class="mt-12 grid grid-cols-2">
      <ChartAccountEventsDonut />
      <ChartAccountEventsTimeline />
    </div>
  </div>
</template>
