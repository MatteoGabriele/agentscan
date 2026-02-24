<script setup lang="ts">
onMounted(() => {
  document.body.classList.add("overflow-hidden");
});

onUnmounted(() => {
  document.body.classList.remove("overflow-hidden");
});

const emits = defineEmits(["close"]);
function closeModal() {
  emits("close");
}
</script>

<template>
  <div class="fixed inset-0 bg-gh-bg/90 z-50 flex items-center justify-center">
    <div
      class="bg-gh-card border-1 border-solid border-gh-border rounded-2 shadow-xl w-full max-w-sm p-6 relative"
    >
      <header class="flex items-center justify-between">
        <span class="i-carbon-scan text-xl block" aria-hidden="true" />

        <button
          @click="closeModal"
          class="size-8 flex items-center justify-center text-gh-muted hover:bg-gh-muted/20 rounded-full transition-colors"
          aria-label="Close login modal"
        >
          <span class="i-carbon-close text-xl" />
        </button>
      </header>

      <slot />
    </div>
  </div>
</template>
