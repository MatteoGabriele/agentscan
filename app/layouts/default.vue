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
    <div class="min-h-screen flex flex-col">
      <header class="h-12 flex justify-end items-center px-6 py-4">
        <nav>
          <ul class="flex items-center gap-4">
            <li>
              <NuxtLink
                external
                target="_blank"
                title="rss feed"
                to="/feed.xml"
                class="flex text-gh-muted hover:text-white"
                aria-label="rss feed"
              >
                <span class="i-carbon:rss text-sm" aria-hidden></span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                external
                target="_blank"
                title="github"
                to="https://github.com/MatteoGabriele/agentscan"
                class="flex text-gh-muted hover:text-white"
                aria-label="rss feed"
              >
                <span class="i-carbon:logo-github text-sm" aria-hidden></span>
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </header>

      <div class="flex flex-1 items-center justify-center">
        <main class="max-w-screen-md mx-auto px-4 py-20 @container w-full">
          <MainLogo :heading-level="isHomePage ? 'h1' : 'h2'" />

          <slot />
        </main>
      </div>
    </div>

    <MainFooter />
  </div>
</template>
