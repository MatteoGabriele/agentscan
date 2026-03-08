<script setup lang="ts">
const router = useRouter();
const accountName = ref("");

function handleSubmit(name: string) {
  router.push({ name: "user-name", params: { name } });
}
</script>

<template>
  <AnalysisForm v-model="accountName" @submit="handleSubmit" />
  <VerifiedAutomationList class="mt-2" />
</template>
