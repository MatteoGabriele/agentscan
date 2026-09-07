<script setup lang="ts">
defineProps<{
  timeLabel: string
}>()
</script>

<template>
  <div class="mb-1 flex flex-col text-[--text-muted]">
    <span>{{ timeLabel }}</span>
  </div>
</template>
