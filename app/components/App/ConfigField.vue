<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
}>()
</script>

<template>
  <fieldset class="min-w-0">
    <legend class="p-0 text-sm font-medium text-ui-text">{{ label }}</legend>
    <p
      v-if="hint || $slots.hint"
      class="mt-1 text-sm text-ui-muted text-pretty"
    >
      <slot name="hint">{{ hint }}</slot>
    </p>
    <div class="mt-3">
      <slot />
    </div>
  </fieldset>
</template>
