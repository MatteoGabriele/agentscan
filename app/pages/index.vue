<script setup lang="ts">
const accountName = ref("");

const router = useRouter();
function handleSubmit() {
  const name = accountName.value.trim();

  if (!name) {
    return;
  }

  router.push({ name: "user-name", params: { name } });
}
</script>

<template>
  <AnalyzeForm v-model="accountName" @submit="handleSubmit" />
</template>
