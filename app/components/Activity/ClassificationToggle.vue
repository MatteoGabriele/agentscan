<script setup lang="ts">
import type { ClassificationLabel } from '@unveil/identity'
import { computed } from 'vue'

const selected = defineModel<ClassificationLabel>()

const options = computed(() => [
  {
    value: 'organic',
    label: 'Organic',
  },
  {
    value: 'mixed',
    label: 'Mixed',
  },
  {
    value: 'automation',
    label: 'Automation',
  },
])
</script>

<template>
  <Toggle v-model="selected" :options="options" />
</template>
