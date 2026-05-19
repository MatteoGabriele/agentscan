<script setup lang="ts"></script>

<template>
  <button
    @click="$router.back()"
    class="text-gh-muted hover:text-gh-text transition-colors flex items-center gap-2"
  >
    <span class="text-lg i-carbon:arrow-left"></span>
    Go back
  </button>
</template>
