<script setup lang="ts" generic="ToggleValue extends string | number | boolean">
type ToggleOptions<T> = {
  value: T
  label: string
  caption?: string
}

const props = defineProps<{
  options: ToggleOptions<ToggleValue>[]
}>()

const selected = defineModel<ToggleValue>()
const selectedToggleCaption = computed<string | undefined>(() => {
  return props.options.find((option) => option.value === selected.value)
    ?.caption
})
</script>

<template>
  <div
    role="group"
    aria-label="Chart time range"
    class="inline-flex gap-0.5 rounded-full border border-gh-border-light/40 p-0.5"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      type="button"
      :aria-pressed="selected === option.value"
      class="rounded-full px-3 py-0.5 text-xs font-medium transition-colors"
      :class="
        selected === option.value
          ? 'bg-gh-border/30 text-gh-text'
          : 'text-gh-muted hover:bg-gh-border/15 hover:text-gh-text'
      "
      @click="selected = option.value"
    >
      {{ option.label }}
    </button>
  </div>

  <p v-if="selectedToggleCaption" class="text-xs text-gh-muted/70">
    {{ selectedToggleCaption }}
  </p>
</template>
