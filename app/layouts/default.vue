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
      content: "Identifying potential automation patterns in GitHub accounts",
    },
    { property: "og:type", content: "website" },
    { name: "color-scheme", content: colorScheme },
  ],
});
</script>

<template>
  <NuxtLoadingIndicator />
  <div class="min-h-screen flex flex-col">
    <header class="p-4 flex items-center justify-end">
      <NuxtLink
        aria-label="Link to Github repository"
        external
        class="hover:text-gh-muted"
        to="https://github.com/MatteoGabriele/agentscan"
      >
        <span class="i-carbon:logo-github text-lg flex" aria-hidden="true" />
      </NuxtLink>
    </header>
    <main
      class="max-w-screen-sm mx-auto py-8 px-4 @container flex-1 w-full flex flex-col justify-center"
    >
      <div class="text-center mb-8">
        <div class="flex items-center justify-center gap-2 mb-2">
          <NuxtLink to="/">
            <span
              class="i-carbon-scan relative top-1 text-gh-blue text-2xl"
              aria-label="Homepage"
            />
          </NuxtLink>

          <h1 class="text-3xl text-gh-text">AgentScan</h1>
        </div>

        <p class="text-gh-muted text-balance @md:text-wrap">
          Identifying potential automation patterns in GitHub accounts
        </p>
      </div>

      <slot />
    </main>

    <footer
      class="py-6 border-t border-gh-border text-center text-gh-muted text-sm"
    >
      <div
        class="mb-2 text-balance text-xs text-gh-muted/70 max-w-220 text-center mx-auto"
      >
        <p>This is an open-source experiment.</p>
        <p>
          Results are based on an opinionated scoring model and should be
          interpreted as possible signals, not conclusions.
        </p>
      </div>

      <NuxtLink
        external
        target="_blank"
        to="https://www.netlify.com"
        class="underline text-gh-muted/70 text-xs"
      >
        This site is powered by Netlify
      </NuxtLink>
    </footer>
  </div>
</template>
