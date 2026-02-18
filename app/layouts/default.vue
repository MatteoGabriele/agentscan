<script setup lang="ts">
useHead({
  title: "AgentScan - GitHub AI Agent Detector",
  meta: [
    { property: "og:title", content: "AgentScan - GitHub AI Agent Detector" },
    {
      property: "og:description",
      content: "Identifying potential automation patterns in GitHub accounts",
    },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <NuxtLoadingIndicator />
  <div class="min-h-screen flex flex-col">
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

          <h1 class="text-3xl text-white">AgentScan</h1>
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
      <p class="mb-2 text-xs text-gh-muted/70 max-w-100 mx-auto">
        Results are based on an opinionated scoring model and should be
        interpreted as signals, not conclusions.
      </p>

      <NuxtLink
        external
        target="_blank"
        to="https://www.netlify.com"
        class="underline text-gh-muted/70 text-sm"
      >
        This site is powered by Netlify
      </NuxtLink>
    </footer>
  </div>
</template>
