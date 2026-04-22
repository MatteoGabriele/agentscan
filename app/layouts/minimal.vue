<script setup lang="ts"></script>

<template>
  <div class="mx-auto max-w-2xl p-6 pb-12 w-full">
    <button
      @click="$router.back()"
      class="text-gh-muted hover:text-gh-text transition-colors flex items-center gap-2"
    >
      <span class="text-lg i-carbon:arrow-left"></span>
      Go back
    </button>

    <div class="mt-8">
      <slot />
    </div>
  </div>
</template>
