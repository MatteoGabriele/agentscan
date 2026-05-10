<script setup lang="ts">
import { useBreakpoints } from "@vueuse/core";

const { data, pending } = useVerifiedAutomations();

const breakpoints = useBreakpoints({ laptop: 700 });
const maxVisible = computed<number>(() => {
  return breakpoints.greaterOrEqual("laptop").value ? 10 : 3;
});
const recentAutomations = computed<VerifiedAutomation[]>(() => {
  const items = data.value ?? [];
  return items.toReversed().slice(0, maxVisible.value);
});
</script>

<template>
  <div>
    <p
      class="text-xs text-gh-muted/60 mb-3 tracking-wider font-medium text-center"
    >
      Latest flagged by the community
    </p>

    <div class="flex flex-wrap items-center justify-center gap-2 min-h-[68px]">
      <template v-if="pending">
        <Skeleton
          v-for="i in maxVisible"
          :key="`skeleton-${i}`"
          width="w-32"
          height="h-10"
          rounded="full"
        />
      </template>
      <template v-else>
        <NuxtLink
          v-for="agent in recentAutomations"
          :key="agent.username"
          :to="{ name: 'user-name', params: { name: agent.username } }"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gh-border/40 bg-white/2 hover:bg-white/4 hover:border-gh-border/60 transition-all"
        >
          <span class="text-gh-text">@{{ agent.username }}</span>
        </NuxtLink>

        <NuxtLink
          :to="{ name: 'automations' }"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-gh-border/20 bg-white/1 text-gh-muted hover:bg-white/2 hover:border-gh-border/40 hover:text-gh-text transition-all"
        >
          <span>View more</span>
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
