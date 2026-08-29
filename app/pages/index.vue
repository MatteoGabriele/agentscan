<script setup lang="ts">
const router = useRouter()
const accountName = ref('')

function handleSubmit(name: string) {
  router.push({ name: 'user-name', params: { name } })
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <AnalysisForm v-model="accountName" autofocus @submit="handleSubmit" />
  </div>

  <LazyVerifiedAutomationList hydrate-on-interaction />

  <LazyCommunityStrip
    hydrate-on-visible
    class="hidden w-full md:flex absolute bottom-8 left-0"
  />
</template>
