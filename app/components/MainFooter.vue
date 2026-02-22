<script setup lang="ts"></script>

<template>
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
</template>
