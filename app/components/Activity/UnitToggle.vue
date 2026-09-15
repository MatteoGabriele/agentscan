<script setup lang="ts">
import { computed } from 'vue'

const selected = defineModel<'percentage' | 'quantity'>()

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
