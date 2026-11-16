<script setup lang="ts" generic="T extends string">
type ViewTab = {
  value: T
  label: string
  icon?: string
}

const props = defineProps<{
  tabs: ViewTab[]
  idBase: string
}>()

const activeTab = defineModel<T>({ required: true })

function selectTab(index: number) {
  const count = props.tabs.length
  const tab = props.tabs.at(((index % count) + count) % count)
  if (!tab) {
    return
  }

  activeTab.value = tab.value
  document.getElementById(`${props.idBase}-tab-${tab.value}`)?.focus()
}

function onKeydown(event: KeyboardEvent, index: number) {
  const target: Record<string, number> = {
    ArrowRight: index + 1,
    ArrowLeft: index - 1,
    Home: 0,
    End: props.tabs.length - 1,
  }

  const next = target[event.key]
  if (next === undefined) {
    return
  }

  event.preventDefault()
  selectTab(next)
}
</script>

<template>
  <div
    role="tablist"
    aria-label="Account result"
    class="grid grid-cols-2 border-y border-solid border-ui-border-subtle/40"
  >
    <button
      v-for="(tab, index) in tabs"
      :id="`${idBase}-tab-${tab.value}`"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="activeTab === tab.value"
      :aria-controls="`${idBase}-panel-${tab.value}`"
      :tabindex="activeTab === tab.value ? 0 : -1"
      class="relative h-11 px-3 flex items-center justify-center gap-2 whitespace-nowrap font-mono text-sm transition-colors duration-300 motion-reduce:transition-none focus-visible:[outline-offset:-4px]"
      :class="
        activeTab === tab.value
          ? 'text-ui-text'
          : 'text-ui-muted hover:text-ui-text hover:bg-ui-border/15'
      "
      @click="activeTab = tab.value"
      @keydown="onKeydown($event, index)"
    >
      <span
        v-if="tab.icon"
        :class="tab.icon"
        class="shrink-0"
        aria-hidden="true"
      />
      {{ tab.label }}

      <span
        v-if="activeTab === tab.value"
        class="absolute inset-x-0 -bottom-px h-0.5 bg-ui-border-subtle"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
