<script setup lang="ts">
definePageMeta({
  layout: "minimal",
});

const route = useRoute();

const { data, status, error } = await useAsyncData(() => {
  const [owner, repo] = route.params.search as string[];

  return $fetch("/api/repo", {
    method: "post",
    body: {
      owner,
      repo,
    },
  });
});
</script>

<template>
  <div v-if="status === 'pending'">loading data...</div>
  <div v-else-if="data" class="pb-12">
    <header>
      <p>
        {{ data.authors.length }} users found from {{ data.issuesCount }} issues
        and {{ data.pullRequestsCount }} PRs
      </p>
    </header>
    <ul class="mt-6">
      <li v-for="author in data.authors" :key="author">
        <p>{{ author }}</p>
      </li>
    </ul>
  </div>
  <div v-else-if="error">
    {{ error.message }}
  </div>
</template>
