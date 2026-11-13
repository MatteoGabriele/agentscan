<script setup lang="ts">
useAppHead()

const route = useRoute()
const isHomePage = computed<boolean>(() => route.name === 'index')
</script>

<template>
  <NuxtLoadingIndicator />

  <div class="flex flex-col">
    <div class="min-h-svh flex flex-col relative @container">
      <div class="sticky-header">
        <MainHeader class="mx-auto w-full max-w-screen-xl" />
      </div>
      <div
        class="flex flex-1 justify-center"
        :class="isHomePage ? 'items-center' : 'items-start'"
      >
        <main
          class="max-w-screen-md mx-auto px-4 @container w-full"
          :class="{ 'py-8 md:py-20': !isHomePage }"
        >
          <LazyMainBrand v-if="isHomePage" class="mb-4" />
          <slot />
        </main>
      </div>
    </div>

    <LazyMainFooter hydrate-on-interaction />
  </div>
</template>
