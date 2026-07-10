<script setup lang="ts">
import { usePreferredDark } from '@vueuse/core'

const darkMode = usePreferredDark()
const colorMode = useColorMode()
const colorScheme = computed(() => {
  return {
    system: darkMode ? 'dark light' : 'light dark',
    light: 'only light',
    dark: 'only dark',
  }[colorMode.preference]
})

useHead({
  title: 'AgentScan - GitHub Automation Detector',
  meta: [
    {
      property: 'og:title',
      content: 'AgentScan - GitHub Automation Detector',
    },
    {
      property: 'og:description',
      content: 'An open experiment in detecting automation patterns on GitHub',
    },
    { property: 'og:type', content: 'website' },
    { name: 'color-scheme', content: colorScheme },
  ],
  link: [
    {
      rel: 'icon',
      href: '/favicon.ico',
      type: 'image/x-icon',
      media: '(prefers-color-scheme: dark)',
    },
    {
      rel: 'icon',
      href: '/favicon-dark.ico',
      type: 'image/x-icon',
      media: '(prefers-color-scheme: light)',
    },
  ],
})
</script>

<template>
  <NuxtLoadingIndicator />

  <div class="flex flex-col">
    <div class="min-h-svh flex flex-col @container">
      <MainHeader class="mx-auto w-full max-w-screen-xl" />

      <main class="main-height">
        <slot />
      </main>
    </div>

    <MainFooter />
  </div>
</template>

<style scoped>
.main-height {
  height: calc(100svh - 48px);
}
</style>
