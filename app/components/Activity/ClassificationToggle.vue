<script setup lang="ts">
import type { ClassificationLabel } from '@unveil/identity'
import { computed } from 'vue'

const selected = defineModel<ClassificationLabel>()

const options = computed(() =>
  NAMED_CATEGORIES.map(({ name, category }) => ({
    value: category,
    label: name,
  })),
)
</script>

<template>
  <Toggle v-model="selected" :options="options" label="Classification" />
</template>
