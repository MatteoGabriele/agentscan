<script setup lang="ts">
const router = useRouter()
const accountName = ref('')

function handleSubmit(name: string) {
  router.push({ name: 'user-name', params: { name } })
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <AnalysisForm v-model="accountName" @submit="handleSubmit" />
  </div>

  <VerifiedAutomationList />

  <ContributorsList
    class="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex"
  />
</template>
