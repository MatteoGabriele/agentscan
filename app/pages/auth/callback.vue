<script setup>
const route = useRoute();

onMounted(() => {
  const params = new URLSearchParams(route.query).toString();
  window.location.href = `/api/auth/callback?${params}`;
});
</script>

<template>
  <div>Logging you in...</div>
</template>
