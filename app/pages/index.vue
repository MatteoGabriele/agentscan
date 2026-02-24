<script setup lang="ts">
const accountName = ref("");

const router = useRouter();
function handleSubmit(name: string) {
  if (!name) {
    return;
  }

  router.push({ name: "user-name", params: { name } });
}
</script>

<template>
  <AnalyzeForm v-model="accountName" @submit="handleSubmit" />
</template>
