<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import type { MenuDropdownItem } from '~~/shared/types/menu'

const props = defineProps<{
  label: string
  items: MenuDropdownItem[]
}>()

const route = useRoute()
const root = useTemplateRef<HTMLElement>('root')
const isOpen = ref<boolean>(false)

const isSectionActive = computed<boolean>(() => {
  return props.items.some((item) => {
    return item.to === '/' ? route.path === '/' : route.path.startsWith(item.to)
  })
})

function isItemActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

onClickOutside(root, () => {
  isOpen.value = false
})

watch(
  () => route.fullPath,
  () => {
    isOpen.value = false
  },
)
</script>

<template>
  <div ref="root" class="relative" @keydown.esc="isOpen = false">
    <button
      type="button"
      class="inline-flex items-center gap-1 text-sm hover:text-ui-text transition-colors cursor-pointer"
      :class="isSectionActive || isOpen ? 'text-ui-text' : 'text-ui-muted'"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      @click="isOpen = !isOpen"
    >
      {{ label }}
      <span
        class="i-lucide:chevron-down text-xs transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
      ></span>
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-3 w-72 rounded-2 border border-solid border-ui-border/60 bg-ui-card p-1.5 shadow-lg shadow-black/25"
      >
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="flex items-start gap-3 rounded-1.5 px-2.5 py-2 hover:bg-ui-muted/15 transition-colors group"
        >
          <span
            class="mt-0.5 shrink-0 group-hover:text-ui-text transition-colors"
            :class="[
              item.icon,
              isItemActive(item.to) ? 'text-ui-text' : 'text-ui-muted',
            ]"
          ></span>
          <span class="flex flex-col gap-0.5">
            <span
              class="text-sm group-hover:text-ui-text transition-colors"
              :class="isItemActive(item.to) ? 'text-ui-text' : 'text-ui-muted'"
            >
              {{ item.label }}
            </span>
            <span class="text-xs text-ui-muted/70 leading-snug">
              {{ item.description }}
            </span>
          </span>
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>
