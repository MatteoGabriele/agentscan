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
      <pre>{{ data }}</pre>
    </div>
    <div v-else-if="error">
      <p>{{ error.message }}</p>
    </div>
  </div>
</template>
