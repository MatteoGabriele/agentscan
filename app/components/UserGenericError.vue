<script setup lang="ts">
defineProps<{
  error: any;
}>();
</script>

<template>
  <div
    class="bg-gh-card p-6 rounded-2 border-2 border-solid border-gh-border text-center"
  >
    <span
      class="i-carbon:wind-power text-xl text-gh-muted mx-auto mb-4 block"
      aria-hidden="true"
    />

    <p class="text-gh-muted">
      {{ error.data?.message }}
    </p>
  </div>
</template>
