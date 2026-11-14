<script setup lang="ts">
defineProps<{
  label: string
  placeholder?: string
}>()

const search = defineModel<string>()
const id = useId()
</script>

<template>
  <div>
    <label :for="id" class="sr-only">{{ label }}</label>
    <input
      :id
      v-model="search"
      type="search"
      :placeholder
      class="w-full px-3 py-2 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text placeholder:text-ui-muted focus:outline-none focus-visible:border-ui-border-subtle focus-visible:ring-2 focus-visible:ring-ui-border-subtle/40"
    />
  </div>
</template>
