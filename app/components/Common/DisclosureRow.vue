<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

const {
  expandable = true,
  chevronSide = 'end',
  summaryClass = '',
  chevronClass = 'mt-0.5 text-sm text-ui-muted',
  panelClass = '',
} = defineProps<{
  // When false, the row is plain text: no button, no chevron, no panel.
  expandable?: boolean
  // `start` points right and turns down; `end` points down and turns up.
  chevronSide?: 'start' | 'end'
  summaryClass?: HTMLAttributes['class']
  chevronClass?: HTMLAttributes['class']
  panelClass?: HTMLAttributes['class']
}>()

defineSlots<{
  summary(): unknown
  aside?(): unknown
  default(): unknown
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const panelId = useId()

const chevronIcon = computed<string[]>(() => {
  if (chevronSide === 'start') {
    return [
      'i-lucide:chevron-right',
      isOpen.value ? 'rotate-90' : 'group-hover:translate-x-0.5',
    ]
  }

  return [
    'i-lucide:chevron-down',
    isOpen.value ? 'rotate-180' : 'group-hover:translate-y-0.5',
  ]
})
</script>

<template>
  <div class="flex items-start gap-3">
    <button
      v-if="expandable"
      type="button"
      class="group flex text-left"
      :class="summaryClass"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? panelId : undefined"
      @click="isOpen = !isOpen"
    >
      <span
        v-if="chevronSide === 'start'"
        class="shrink-0 transition-all group-hover:text-ui-text"
        :class="[chevronIcon, chevronClass]"
        aria-hidden="true"
      />
      <slot name="summary" />
      <span
        v-if="chevronSide === 'end'"
        class="shrink-0 transition-all group-hover:text-ui-text"
        :class="[chevronIcon, chevronClass]"
        aria-hidden="true"
      />
    </button>
    <div v-else class="flex" :class="summaryClass">
      <slot name="summary" />
    </div>

    <slot name="aside" />
  </div>

  <div v-if="expandable && isOpen" :id="panelId" :class="panelClass">
    <slot />
  </div>
</template>
