<script setup lang="ts">
const router = useRouter();
const accountName = ref("");

function handleSubmit(name: string) {
  router.push({ name: "user-name", params: { name } });
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <AnalysisForm v-model="accountName" @submit="handleSubmit" />
  </div>
  <VerifiedAutomationList class="mt-2" />
</template>
