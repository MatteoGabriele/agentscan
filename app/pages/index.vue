<script setup lang="ts">
const router = useRouter();
const accountName = ref("");

function handleSubmit(name: string) {
  router.push({ name: "user-name", params: { name } });
}
</script>

<template>
  <div class="max-w-xl mx-auto">
    <AnalysisForm v-model="accountName" @submit="handleSubmit" />
  </div>
  <VerifiedAutomationList class="mt-2" />
</template>
