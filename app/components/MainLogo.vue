<script setup lang="ts"></script>

<template>
  <div class="text-center mb-8">
    <div class="flex items-center justify-center gap-2 mb-2">
      <NuxtLink to="/">
        <span
          class="i-carbon-scan relative top-1 text-gh-text text-2xl"
          aria-label="Homepage"
        />
      </NuxtLink>

      <h1 class="text-3xl text-gh-text">AgentScan</h1>
    </div>

    <p class="text-gh-muted text-balance @md:text-wrap">
      Identifying potential automation patterns in GitHub accounts
    </p>
  </div>
</template>
