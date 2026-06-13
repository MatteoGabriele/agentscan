<script setup lang="ts">
defineProps<{
  label: string;
  to: string;
}>();
</script>

<template>
  <NuxtLink
    :to
    v-slot="{ isActive }"
    class="inline-flex items-center text-gh-muted hover:text-gh-text transition-colors text-sm"
  >
    <span
      class="text-gh-muted hover:text-gh-text transition-colors"
      :class="{ 'text-gh-text': isActive }"
    >
      {{ label }}
    </span>
  </NuxtLink>
</template>
