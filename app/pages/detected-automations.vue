<script setup lang="ts">
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { data, status, error } = useDetectedAutomations();
const search = ref("");

const formatRelativeTime = (dateString: string): string => {
  return dayjs(dateString).fromNow();
};

const formatDateNice = (dateString: string): string => {
  return dayjs(dateString).format("MMM D, YYYY");
};

const isSameDate = (date1: string, date2: string): boolean => {
  return dayjs(date1).isSame(date2, "day");
};

const items = computed(() => {
  return data.value ?? [];
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

useHead({
  title: "Daily flags | AgentScan",
  meta: [
    { property: "og:title", content: "Daily flags | AgentScan" },
    {
      property: "og:description",
      content:
        "Accounts detected during the GitHub Ecosystem Health daily scans",
    },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <header class="text-center md:text-left text-pretty">
    <h1 class="text-2xl font-semibold">Daily flags</h1>
    <p class="text-gh-muted mt-2">
      Accounts identified by the daily
      <NuxtLink to="/health" class="underline hover:text-gh-text">
        GitHub Ecosystem Health
      </NuxtLink>
      scan as showing signs of automated behavior.
    </p>

    <input
      v-model="search"
      type="text"
      placeholder="Search by username..."
      class="mt-12 w-full px-3 py-2 bg-gh-bg border border-gh-border rounded text-sm text-gh-text placeholder:text-gh-muted focus:outline-none focus:border-gh-border/80"
    />
  </header>

  <div v-if="status === 'pending'" class="mt-12">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gh-border-light">
            <th class="text-left py-2 px-3 font-semibold text-gh-text">
              Username
            </th>
            <th class="text-right py-2 px-3 font-semibold text-gh-text">
              Pull Requests
            </th>
            <th
              class="hidden md:table-cell text-left py-2 px-3 font-semibold text-gh-text"
            >
              First Detected
            </th>
            <th
              class="hidden md:table-cell text-left py-2 px-3 font-semibold text-gh-text"
            >
              Last Detected
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in 12"
            :key="item"
            class="border-b border-gh-border-light"
          >
            <td class="py-3 px-3">
              <div class="h-4 bg-gh-border rounded w-42 animate-pulse" />
            </td>
            <td class="py-3 px-3 text-right">
              <div
                class="h-4 bg-gh-border rounded w-12 ml-auto animate-pulse"
              />
            </td>
            <td class="hidden md:table-cell py-3 px-3">
              <div class="h-4 bg-gh-border rounded w-1/3 animate-pulse" />
            </td>
            <td class="hidden md:table-cell py-3 px-3">
              <div class="h-4 bg-gh-border rounded w-1/3 animate-pulse" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else-if="error">
    {{ error.message }}
  </div>
  <div v-else-if="data" class="mt-12">
    <div v-if="filteredItems.length === 0" class="text-center py-8">
      <p class="text-gh-muted">No accounts found matching "{{ search }}"</p>
    </div>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gh-border-light">
            <th class="text-left py-2 px-3 font-semibold text-gh-text">
              Username
            </th>
            <th class="text-right py-2 px-3 font-semibold text-gh-text">
              Pull Requests
            </th>
            <th
              class="hidden md:table-cell text-left py-2 px-3 font-semibold text-gh-text"
            >
              First Detected
            </th>
            <th
              class="hidden md:table-cell text-left py-2 px-3 font-semibold text-gh-text"
            >
              Last Detected
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="item.userId"
            class="border-b border-gh-border-light hover:bg-gh-border-light/30 transition-colors"
          >
            <td class="py-3 px-3">
              <NuxtLink
                :to="`/user/${item.username}`"
                class="font-mono font-semibold text-gh-accent hover:underline transition-colors"
              >
                {{ item.username ?? `User ${item.userId}` }}
              </NuxtLink>
            </td>
            <td class="py-3 px-3 text-right text-gh-muted">
              {{ item.totalPrs }}
            </td>
            <td class="hidden md:table-cell py-3 px-3 text-xs text-gh-muted">
              <span
                v-if="item.firstDetected"
                :title="`${formatDateNice(item.firstDetected)}`"
              >
                {{ formatRelativeTime(item.firstDetected) }}
              </span>
            </td>
            <td class="hidden md:table-cell py-3 px-3 text-xs text-gh-muted">
              <span
                v-if="item.lastDetected"
                :title="`${formatDateNice(item.lastDetected)}`"
              >
                {{ formatRelativeTime(item.lastDetected) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
