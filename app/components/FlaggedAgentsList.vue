<script setup lang="ts">
import type { VerifiedAutomation } from "~~/server/api/verified-automations.get";

defineProps<{
  agents: VerifiedAutomation[];
}>();
</script>

<template>
  <div>
    <p
      class="text-xs text-gh-muted/60 mb-3 tracking-wider font-medium text-center"
    >
      Latest flagged by the community
    </p>
    <div class="flex flex-wrap items-center justify-center gap-2">
      <NuxtLink
        v-for="agent in agents"
        :key="agent.username"
        :to="{ name: 'user-name', params: { name: agent.username } }"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gh-border/40 bg-white/2 hover:bg-white/4 hover:border-gh-border/60 transition-all"
      >
        <span class="text-gh-text">@{{ agent.username }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
