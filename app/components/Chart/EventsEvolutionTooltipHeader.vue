<script setup lang="ts">
withDefaults(
  defineProps<{
    timeLabel: string
    count: number
    countLabel?: string
  }>(),
  {
    countLabel: 'Pull requests scanned:',
  },
)
</script>

<template>
  <div class="mb-1 flex flex-col text-[--text-muted]">
    <span>{{ timeLabel }}</span>
    <span>{{ countLabel }} {{ count }}</span>
  </div>
</template>
