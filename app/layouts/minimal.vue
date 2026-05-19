<template>
  <NuxtLoadingIndicator />
  <div class="mx-auto max-w-2xl h-screen p-6 pb-12 w-full">
    <slot name="header" />
    <div class="pt-8 h-full">
      <slot />
    </div>
  </div>
</template>
