<script setup lang="ts">
import type { IdentityClassification } from '@unveil/identity'
import { computed } from 'vue'

const selected = defineModel<IdentityClassification>()

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
