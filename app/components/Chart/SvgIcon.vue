<script setup lang="ts">
const {
  title = '',
  background = '',
  backgroundRadius = 12,
} = defineProps<{
  icon: string
  title?: string
  background?: string
  backgroundRadius?: number
}>()
</script>

<template>
  <title v-if="title">{{ title }}</title>
  <circle v-if="background" :r="backgroundRadius" :fill="background" />
  <!-- eslint-disable vue/no-v-text-v-html-on-component, vue/no-v-html -->
  <g
    transform="translate(-7.68, -7.68) scale(0.64)"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    fill="none"
    v-html="icon"
  />
  <!-- eslint-enable vue/no-v-text-v-html-on-component, vue/no-v-html -->
</template>
