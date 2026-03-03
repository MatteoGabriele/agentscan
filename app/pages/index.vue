<script setup lang="ts">
import dayjs from "dayjs";

const accountName = ref("");

const router = useRouter();
function handleSubmit(name: string) {
  if (!name) {
    return;
  }

  router.push({ name: "user-name", params: { name } });
}

const { latestFlaggedAgents } = await useFlaggedAgents();
</script>

<template>
  <AnalyzeForm v-model="accountName" @submit="handleSubmit" />
  <FlaggedAgentsList
    v-if="latestFlaggedAgents.length > 0"
    class="mt-2"
    :agents="latestFlaggedAgents"
  />
</template>
