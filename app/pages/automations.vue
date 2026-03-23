<script setup lang="ts">
import dayjs from "dayjs";

const { data, status, error } = useVerifiedAutomations();

const items = computed(() => {
  const items = data.value ?? [];
  return items.toSorted((a, b) => dayjs(b.createdAt).diff(dayjs(a.createdAt)));
});

useHead({
  title: "Verified automations | AgentScan",
  meta: [
    { property: "og:title", content: "Verified automations | AgentScan" },
    {
      property: "og:description",
      content: "A list of community flagged automated accounts",
    },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <div class="mx-auto max-w-2xl px-6 py-16 w-full">
    <h1 class="text-2xl font-semibold">Community verified automation list</h1>
    <p v-if="items?.[0]" class="mt-2 text-sm text-gray-500">
      Last updated:

      <span
        v-if="status === 'pending'"
        class="h-2.5 bg-gh-border rounded w-20 inline-block animate-pulse"
      />
      <NuxtTime v-else :datetime="items[0].createdAt" />
    </p>

    <div v-if="status === 'pending'" class="mt-12">
      <ul class="flex flex-col gap-4 w-full">
        <li
          v-for="item in 3"
          :key="item"
          class="not-last:border-b border-gh-border-light pb-6 mb-2"
        >
          <article>
            <div class="w-full animate-pulse">
              <div class="mb-4">
                <div class="h-6 bg-gh-border rounded w-1/3" />
              </div>
              <div class="space-y-4">
                <div class="h-3 bg-gh-border rounded w-5/6" />
                <div class="h-3 bg-gh-border rounded w-4/6" />
              </div>
            </div>
            <footer
              class="flex items-baseline justify-between mt-4 animate-pulse"
            >
              <div class="h-3 bg-gh-border rounded w-20" />
              <div class="h-3 bg-gh-border rounded w-20" />
            </footer>
          </article>
        </li>
      </ul>
    </div>
    <div v-else-if="error">
      {{ error.message }}
    </div>
    <div v-else-if="data" class="mt-12">
      <ul class="flex flex-col gap-4">
        <li
          v-for="item in items"
          :key="item.username"
          class="not-last:border-b border-gh-border-light pb-6 mb-2"
        >
          <article>
            <h2>
              <NuxtLink
                :to="`/user/${item.username}`"
                class="text-xl font-mono underline hover:text-gh-muted"
              >
                {{ item.username }}
              </NuxtLink>
            </h2>

            <p class="my-2 text-sm">{{ item.reason }}</p>

            <footer class="flex items-baseline justify-between mt-4">
              <p class="text-gh-muted text-xs">
                Flagged
                <NuxtTime :title="item.createdAt" :datetime="item.createdAt" />
              </p>
              <NuxtLink
                :to="item.issueUrl"
                target="_blank"
                external
                class="underline inline text-xs hover:text-gh-muted"
              >
                View issue
              </NuxtLink>
            </footer>
          </article>
        </li>
      </ul>
    </div>
  </div>
</template>
