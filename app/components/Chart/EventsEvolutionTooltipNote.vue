<script setup lang="ts">
defineProps<{
  icon: string
  text: string
  color?: string
}>()
</script>

<template>
  <div class="flex flex-row gap-2 max-w-[280px]">
    <span class="w-6 shrink-0" :class="icon" :style="{ color }" />
    <span>{{ text }}</span>
  </div>
</template>
