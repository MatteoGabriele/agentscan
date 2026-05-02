<script setup lang="ts">
const { data, status, error } = useScan();

definePageMeta({
  layout: "minimal",
});
</script>

<template>
  <div>
    <div v-if="status === 'pending'">loading data...</div>
    <div v-else-if="data">
      <details>
        <summary>raw data output ({{ data.length }})</summary>
        <pre>{{ data }}</pre>
      </details>
    </div>
    <div v-else-if="error">
      <p>{{ error.message }}</p>
    </div>
  </div>
</template>
