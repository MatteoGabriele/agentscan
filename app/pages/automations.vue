<script setup lang="ts">
const { data, status, error } = useVerifiedAutomations();
const search = ref("");

const items = computed(() => {
  return data.value?.toReversed() ?? [];
});

const fuzzySearch = (query: string, text: string): boolean => {
  const queryTrimmed = query.toLowerCase();
  let textIndex = 0;

  for (let i = 0; i < queryTrimmed.length; i++) {
    textIndex = text.toLowerCase().indexOf(queryTrimmed[i] ?? "", textIndex);
    if (textIndex === -1) return false;
    textIndex++;
  }

  return true;
};

const filteredItems = computed(() => {
  const query = search.value.trim();

  if (!query) {
    return items.value;
  }

  return items.value.filter((item) => fuzzySearch(query, item.username));
});

definePageMeta({
  layout: "minimal",
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
  <header class="text-center md:text-left">
    <h1 class="text-2xl font-semibold">Community verified automations</h1>
    <p class="text-gh-muted mt-1">
      This is a list of accounts verified by the community as using heavy
      automation, spamming through automation, or operating as bots.
    </p>
    <p v-if="items?.[0]" class="mt-6 text-sm text-gray-500">
      Last updated:

      <span
        v-if="status === 'pending'"
        class="h-2.5 bg-gh-border rounded w-20 inline-block animate-pulse"
      />
      <NuxtTime v-else :datetime="items[0].createdAt" />
    </p>

    <input
      v-model="search"
      type="text"
      placeholder="Search by username..."
      class="mt-12 w-full px-3 py-2 bg-gh-bg border border-gh-border rounded text-sm text-gh-text placeholder:text-gh-muted focus:outline-none focus:border-gh-border/80"
    />
  </header>

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
      <li v-if="filteredItems.length === 0">
        No account has been found under "{{ search }}"
      </li>
      <li
        v-for="item in filteredItems"
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
</template>
