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

const route = useRoute();
const isHomePage = computed<boolean>(() => route.name === "index");
</script>

<template>
  <NuxtLoadingIndicator />

  <div class="flex flex-col">
    <main
      class="max-w-screen-md mx-auto px-4 py-20 @container w-full min-h-screen flex flex-col"
      :class="{ 'justify-center': isHomePage }"
    >
      <MainLogo :heading-level="isHomePage ? 'h1' : 'h2'" />

      <slot />
    </main>

    <MainFooter />
  </div>
</template>
