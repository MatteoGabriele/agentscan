<script setup lang="ts"></script>

<template>
  <footer
    class="border-t border-gh-border bg-gradient-to-b from-transparent to-gh-bg-subtle"
  >
    <div class="max-w-screen-lg mx-auto px-4 py-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
          class="border border-gh-border/50 rounded-lg bg-white/1 p-6 hover:border-gh-border transition-colors"
        >
          <div>
            <h3 class="text-sm font-semibold text-gh-text mb-3">AgentScan</h3>
            <p class="text-xs text-gh-muted/80 leading-relaxed">
              An experimental tool for analyzing GitHub activity patterns and
              behavioral signals.
            </p>
          </div>
        </div>

        <div
          class="border border-gh-border/50 rounded-lg bg-white/1 p-6 hover:border-gh-border transition-colors"
        >
          <div class="flex-1">
            <h4
              class="text-xs font-semibold text-gh-text mb-3 uppercase tracking-wider"
            >
              About
            </h4>
            <p class="text-xs text-gh-muted/80 leading-relaxed mb-3">
              Results are based on pattern analysis and should be interpreted as
              <span class="font-medium">possible signals</span>, not
              conclusions.
            </p>
            <p class="text-xs text-gh-muted/70">
              Always verify findings with additional context.
            </p>
          </div>
        </div>

        <div
          class="border border-gh-border/50 rounded-lg bg-white/1 p-6 hover:border-gh-border transition-colors"
        >
          <div class="flex-1">
            <h4
              class="text-xs font-semibold text-gh-text mb-4 uppercase tracking-wider"
            >
              Links
            </h4>
            <div class="flex flex-col gap-3">
              <NuxtLink
                external
                target="_blank"
                to="https://github.com/matteogabriele/agentscan"
                class="text-xs text-gh-muted/80 hover:text-gh-text transition-colors underline"
              >
                GitHub Repository
              </NuxtLink>
              <NuxtLink
                external
                target="_blank"
                to="https://github.com/matteogabriele/agentscan/issues"
                class="text-xs text-gh-muted/80 hover:text-gh-text transition-colors underline"
              >
                Report Issues
              </NuxtLink>
              <NuxtLink
                external
                target="_blank"
                to="https://github.com/matteogabriele/agentscan/blob/main/README.md"
                class="text-xs text-gh-muted/80 hover:text-gh-text transition-colors underline"
              >
                Documentation
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div
        class="border-t border-gh-border/50 pt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <p class="text-xs text-gh-muted/60">
          Made with <span class="text-red-400">♥</span> · Contributions welcome
        </p>
        <p class="text-xs text-gh-muted/60">
          Powered by
          <NuxtLink
            external
            target="_blank"
            to="https://www.netlify.com"
            class="text-gh-muted/80 hover:text-gh-text transition-colors underline"
          >
            Netlify
          </NuxtLink>
        </p>
      </div>
    </div>
  </footer>
</template>
