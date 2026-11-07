<script setup lang="ts">
import { useMounted } from '@vueuse/core'

const colorMode = useColorMode()
const isMounted = useMounted()

const nextTheme = computed(() =>
  colorMode.value === 'light' ? 'dark' : 'light',
)

const label = computed(() =>
  isMounted.value ? `Switch to ${nextTheme.value} theme` : 'Switch theme',
)

function toggleTheme() {
  colorMode.preference = nextTheme.value
}
</script>

<template>
  <button
    type="button"
    class="grid size-8 place-items-center rounded-full text-ui-muted transition-colors hover:bg-ui-muted/10 hover:text-ui-text"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <span class="theme-icon-sun i-lucide:sun" aria-hidden="true"></span>
    <span class="theme-icon-moon i-lucide:moon" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
/* Dark is the default theme, so it shows the sun to switch to light. */
.theme-icon-moon {
  display: none;
}

:root[data-theme='light'] .theme-icon-sun {
  display: none;
}

:root[data-theme='light'] .theme-icon-moon {
  display: inline-block;
}
</style>
