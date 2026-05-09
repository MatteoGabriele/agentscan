<script setup lang="ts">
const { data, status, error } = useScan();

definePageMeta({
  layout: "minimal",
});

useHead({
  title: "Verified automations | AgentScan",
  meta: [
    { property: "og:title", content: "Verified automations | AgentScan" },
    {
      property: "og:description",
      content: "A list of community flagged automated accounts",
    },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <header class="text-center md:text-left">
    <h1 class="text-2xl font-semibold">Ecosystem health</h1>
    <p class="text-gh-muted mt-1">
      We analyze 100 unique accounts daily from trending repositories to track
      automation, spam, and bot activity patterns over time. This gives you
      insight into the health and trends of the GitHub community.
    </p>
  </header>
  <div class="flex items-center justify-center mt-12">
    <div
      v-if="status === 'pending'"
      class="text-center text-gray-500 dark:text-gray-400"
    >
      loading data...
    </div>
    <div v-else-if="data" class="flex items-center justify-center w-full mt-12">
      <div class="max-w-4xl">
        <ChartGlobalStatusDashboard :data />
      </div>
    </div>
    <div v-else-if="error" class="text-red-600 dark:text-red-400 text-sm">
      {{ error.message }}
    </div>
  </div>
</template>
