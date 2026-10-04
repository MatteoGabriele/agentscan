<script setup lang="ts">
import { computed } from 'vue'
import type { ActivityUnit } from '~~/shared/types/activity'

const selected = defineModel<ActivityUnit>()

const options = computed(() => [
  {
    value: 'percentage',
    label: 'Percentage',
  },
  {
    value: 'quantity',
    label: 'Quantity',
  },
])
</script>

<template>
  <Toggle v-model="selected" :options="options" />
</template>
