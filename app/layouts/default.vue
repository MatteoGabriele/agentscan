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
    <div class="min-h-svh flex flex-col">
      <header class="h-12 flex justify-between items-center px-4 md:px-6 py-4">
        <div>
          <NuxtLink
            external
            target="_blank"
            to="https://github.com/marketplace/actions/agentscan"
            class="inline-flex items-center px-2.5 gap-2 py-1 text-xs font-medium rounded-full border border-gh-border/80 text-gh-muted hover:text-gh-text hover:border-gh-border/60 transition-colors"
            title="Use it as a GitHub Action"
          >
            <span class="i-carbon:logo-github text-sm" />
            Use as GitHub Action
          </NuxtLink>
        </div>
        <nav>
          <ul class="flex items-center gap-6">
            <li>
              <NuxtLink
                to="/scanner"
                class="flex text-gh-muted hover:text-white"
              >
                Scanner
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/health"
                class="inline-flex items-center text-sm text-gh-muted hover:text-gh-text transition-colors"
              >
                Ecosystem health
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/lab"
                class="inline-flex items-center text-sm text-gh-muted hover:text-gh-text transition-colors"
              >
                The lab
              </NuxtLink>
            </li>
            <li class="hidden md:block w-px h-4 bg-gh-border/80"></li>
            <li class="hidden md:block">
              <NuxtLink
                external
                target="_blank"
                title="RSS feed"
                to="/feed.xml"
                class="inline-flex items-center text-sm text-gh-muted hover:text-gh-text transition-colors"
              >
                RSS
              </NuxtLink>
            </li>
            <li class="hidden md:block">
              <NuxtLink
                external
                target="_blank"
                title="GitHub repository"
                to="https://github.com/MatteoGabriele/agentscan"
                class="inline-flex items-center text-sm text-gh-muted hover:text-gh-text transition-colors"
              >
                GitHub
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
