<script setup lang="ts">
useAppHead()
</script>

<template>
  <NuxtLoadingIndicator />

  <div class="flex flex-col @container">
    <div class="sticky-header">
      <MainHeader only-logo />
    </div>

    <div class="min-h-[calc(100svh-60px)] flex flex-col relative">
      <div v-if="$slots.hero" class="flex flex-1 items-center justify-center">
        <section
          class="max-w-screen-md mx-auto px-4 @container w-full py-10 md:py-20"
        >
          <slot name="hero" />
        </section>
      </div>
    </div>

    <slot />

    <MainFooter />
  </div>
</template>
