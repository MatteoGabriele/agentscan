<script setup lang="ts">
import { formatCompactNumber } from '~~/shared/utils/numbers'

const { data } = await useRepoStars()

const root = useTemplateRef<HTMLElement>('root')
const isOpen = ref<boolean>(false)

const stars = computed<string | null>(() => {
  const count = data.value?.stars

  return typeof count === 'number' ? formatCompactNumber(count) : null
})

const repos = computed(() => {
  return data.value?.repos ?? []
})

function onFocusOut(event: FocusEvent) {
  const target = event.relatedTarget

  if (target instanceof Node && root.value?.contains(target)) {
    return
  }

  isOpen.value = false
}
</script>

<template>
  <div
    ref="root"
    class="relative"
    @mouseenter="isOpen = true"
    @mouseleave="isOpen = false"
    @focusin="isOpen = true"
    @focusout="onFocusOut"
    @keydown.esc="isOpen = false"
  >
    <NuxtLink
      external
      target="_blank"
      rel="noopener"
      to="https://github.com/MatteoGabriele/agentscan"
      class="inline-flex items-center gap-2 rounded-full border border-solid border-ui-border/80 px-2.5 py-1 text-xs text-ui-muted hover:text-ui-text hover:border-ui-border/60 transition-colors"
      title="AgentScan on GitHub"
      aria-label="AgentScan on GitHub"
    >
      <span class="i-lucide-github"></span>

      <template v-if="stars">
        <span class="h-3 w-px bg-ui-border/70"></span>
        <span class="inline-flex items-center gap-1 tabular-nums">
          <span class="i-lucide:star text-[0.9em]"></span>
          {{ stars }}
        </span>
      </template>
    </NuxtLink>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen && repos.length"
        class="absolute right-0 top-full z-50 flex flex-col items-end gap-2 pt-2"
      >
        <NuxtLink
          v-for="repo in repos"
          :key="repo.url"
          external
          target="_blank"
          rel="noopener"
          :to="repo.url"
          class="inline-flex items-center gap-2 rounded-full border border-solid border-ui-border/80 bg-ui-card px-2.5 py-1 text-xs text-ui-muted hover:text-ui-text hover:border-ui-border/60 transition-colors whitespace-nowrap"
          :title="`${repo.label} on GitHub`"
          :aria-label="`${repo.label} on GitHub`"
        >
          {{ repo.label }}

          <span class="h-3 w-px bg-ui-border/70"></span>
          <span class="inline-flex items-center gap-1 tabular-nums">
            <span class="i-lucide:star text-[0.9em]"></span>
            {{ formatCompactNumber(repo.stars) }}
          </span>
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>
