<script setup lang="ts">
import { usePreferredDark } from "@vueuse/core";

const darkMode = usePreferredDark();
const colorMode = useColorMode();
const colorScheme = computed(() => {
  return {
    system: darkMode ? "dark light" : "light dark",
    light: "only light",
    dark: "only dark",
  }[colorMode.preference];
});

useHead({
  title: "AgentScan - GitHub AI Agent Detector",
  meta: [
    { property: "og:title", content: "AgentScan - GitHub AI Agent Detector" },
    {
      property: "og:description",
      content: "An open experiment in detecting automation patterns on GitHub",
    },
    { property: "og:type", content: "website" },
    { name: "color-scheme", content: colorScheme },
  ],
  link: [
    {
      rel: "icon",
      href: "/favicon.ico",
      type: "image/x-icon",
      media: "(prefers-color-scheme: dark)",
    },
    {
      rel: "icon",
      href: "/favicon-dark.ico",
      type: "image/x-icon",
      media: "(prefers-color-scheme: light)",
    },
  ],
});
</script>

<template>
  <NuxtLoadingIndicator />

  <div class="min-h-screen flex flex-col">
    <MainHeader />

    <main
      class="max-w-screen-sm mx-auto py-8 px-4 @container flex-1 w-full flex flex-col justify-center"
    >
      <MainLogo />

      <slot />
    </main>

    <MainFooter />
  </div>
</template>
