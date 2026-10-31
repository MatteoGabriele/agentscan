<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  value?: string
}>()

// A boolean for a single toggle, an array when several boxes share a list.
const model = defineModel<boolean | string[]>()
</script>

<template>
  <label class="group flex items-start gap-2.5 cursor-pointer">
    <input
      v-model="model"
      type="checkbox"
      :value
      class="mt-1 shrink-0 accent-ui-accent"
    />
    <span class="flex flex-col">
      <span class="text-sm text-ui-text/90 group-hover:text-ui-text">
        {{ label }}
      </span>
      <span v-if="hint" class="text-xs text-ui-muted text-pretty">
        {{ hint }}
      </span>
    </span>
  </label>
</template>
