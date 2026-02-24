<script setup>
definePageMeta({ layout: false });

const route = useRoute();
onMounted(() => {
  const params = new URLSearchParams(route.query).toString();
  window.location.href = `/api/auth/callback?${params}`;
});
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-8 h-screen w-screen"
  >
    <span
      class="i-carbon-scan relative top-1 text-gh-blue text-2xl"
      aria-hidden="true"
    />

    <div class="flex flex-col items-center gap-2">
      <p class="text-sm">Logging you in...</p>
      <span class="i-carbon-circle-dash animate-spin text-lg text-gh-muted" />
    </div>
  </div>
</template>
