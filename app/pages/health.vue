<script setup lang="ts">
const { data, status, error } = useScan();

definePageMeta({
  layout: "minimal",
});

const expandedDates = ref<Set<string>>(new Set());

const groupedByDate = computed(() => {
  if (!data.value) return {};

  return data.value.reduce(
    (groups: Record<string, typeof data.value>, item) => {
      const date = new Date(item.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
      return groups;
    },
    {},
  );
});

const sortedDates = computed(() => {
  return Object.keys(groupedByDate.value).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );
});

const averageScorePerDate = computed(() => {
  const averages: Record<string, number> = {};
  for (const date of sortedDates.value) {
    const items = groupedByDate.value[date];

    if (!items) {
      return;
    }

    const sum = items.reduce((acc, item) => acc + item.score, 0);
    averages[date] = sum / items.length;
  }
  return averages;
});

const toggleDate = (date: string) => {
  if (expandedDates.value.has(date)) {
    expandedDates.value.delete(date);
  } else {
    expandedDates.value.add(date);
  }
};
</script>

<template>
  <div class="p-8 max-w-2xl mx-auto">
    <div
      v-if="status === 'pending'"
      class="text-center text-gray-500 dark:text-gray-400"
    >
      loading data...
    </div>
    <div v-else-if="data" class="space-y-1">
      <h1 class="text-2xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Daily Anonymous Analysis
      </h1>
      <div
        v-for="date in sortedDates"
        :key="date"
        class="border border-gray-200 dark:border-gray-700 rounded"
      >
        <button
          @click="toggleDate(date)"
          class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        >
          <div class="flex items-center gap-3">
            <span
              class="text-sm font-semibold text-gray-700 dark:text-gray-200"
              >{{ date }}</span
            >
            <span class="text-sm text-gray-500 dark:text-gray-400">
              ({{ groupedByDate[date]?.length }})
            </span>
          </div>
          <div class="flex items-center gap-4">
            <span
              class="text-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Avg: {{ Math.round(averageScorePerDate?.[date] ?? 0) }}
            </span>
            <span
              :class="[
                'i-carbon:chevron-down w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform',
                expandedDates.has(date) ? 'rotate-180' : '',
              ]"
            />
          </div>
        </button>
        <div
          v-show="expandedDates.has(date)"
          class="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700"
        >
          <div
            v-for="item in groupedByDate[date]"
            :key="item.hash"
            class="px-4 py-3"
          >
            <div class="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span
                >Score:
                <span class="font-semibold text-gray-700 dark:text-gray-200">{{
                  Math.round(item.score)
                }}</span></span
              >
              <span
                >Repos:
                <span class="font-semibold text-gray-700 dark:text-gray-200">{{
                  item.user_public_repos_count
                }}</span></span
              >
              <span
                >Events:
                <span class="font-semibold text-gray-700 dark:text-gray-200">{{
                  item.events_count
                }}</span></span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else-if="error" class="text-red-600 dark:text-red-400 text-sm">
      {{ error.message }}
    </div>
  </div>
</template>
