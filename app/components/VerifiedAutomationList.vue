<script setup lang="ts">
import dayjs from "dayjs";
import type { VerifiedAutomation } from "~~/server/api/verified-automations.get";

const { data, pending } = useVerifiedAutomations();

const recentAutomations = computed<VerifiedAutomation[]>(() => {
  const items = data.value ?? [];
  return items
    .toSorted((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)))
    .slice(0, 3);
});
</script>

<template>
  <div>
    <p
      class="text-xs text-gh-muted/60 mb-3 tracking-wider font-medium text-center"
    >
      Latest flagged by the community
    </p>

    <div class="flex flex-wrap items-center justify-center gap-2">
      <template v-if="pending">
        <div
          v-for="i in 3"
          :key="`skeleton-${i}`"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gh-border/40"
        >
          <Skeleton width="w-24" height="h-4" />
        </div>
      </template>

      <template v-else-if="recentAutomations.length">
        <NuxtLink
          v-for="agent in recentAutomations"
          :key="agent.username"
          :to="{ name: 'user-name', params: { name: agent.username } }"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gh-border/40 bg-white/2 hover:bg-white/4 hover:border-gh-border/60 transition-all"
        >
          <span class="text-gh-text">@{{ agent.username }}</span>
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
