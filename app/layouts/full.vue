<script setup lang="ts">
useAppHead()
</script>

<template>
  <NuxtLoadingIndicator />

  <div class="flex flex-col">
    <div class="min-h-svh flex flex-col @container">
      <div class="sticky-header">
        <MainHeader class="mx-auto w-full max-w-screen-xl" />
      </div>

      <main v-if="$slots.hero" class="main-height">
        <slot name="hero" />
      </main>

      <slot />
    </div>

    <MainFooter />
  </div>
</template>

<style scoped>
.main-height {
  height: calc(100svh - 60px);
}
</style>
