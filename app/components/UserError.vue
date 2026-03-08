<script setup lang="ts">
defineProps<{
  error?: any;
}>();
</script>

<template>
  <div
    v-if="error?.statusCode === 404"
    class="bg-gh-card p-6 rounded-2 border-2 border-solid border-gh-border text-center"
  >
    <span
      class="i-carbon:connection-signal-off text-4xl text-gh-muted mx-auto mb-4 block"
      aria-hidden="true"
    />
    <h3 class="text-xl font-mono text-gh-text mb-2">User not found</h3>
    <p class="text-gh-muted">Double-check the username and try again</p>
  </div>
  <div
    v-else="error"
    class="bg-gh-card p-6 rounded-2 border-2 border-solid border-gh-border text-center"
  >
    <span
      class="i-carbon:sailboat-offshore text-4xl text-gh-muted mx-auto mb-4 block"
      aria-hidden="true"
    />
    <h3 class="text-xl font-mono text-gh-text mb-2">Lost at sea</h3>
    <p class="text-gh-muted">
      {{ error.data?.message || "Failed to analyze user" }}
    </p>
  </div>
</template>
