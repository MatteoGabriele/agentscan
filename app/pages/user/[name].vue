<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const username = computed(() => {
  if (!route.params.name) {
    return "";
  }

  if (typeof route.params.name === "string") {
    return route.params.name;
  }

  return route.params.name[0] ?? "";
});

const { data: user, error } = await useFetch(
  () => `/api/account/${username.value}`,
  {
    key: `account:${username.value}`,
    watch: [username],
  },
);

async function handleSubmit(name: string) {
  await router.push({ name: "user-name", params: { name } });
}

const ogTitle = computed(() => {
  if (!username.value) {
    return;
  }

  return `${username.value} | AgentScan`;
});

const ogImage = computed(() => {
  if (!user.value) {
    return "/og.png";
  }

  return user.value.avatar_url;
});

useHead({
  title: ogTitle,
  meta: [
    { property: "og:title", content: ogTitle },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <h1 class="sr-only">{{ username }} analysis page</h1>

  <AnalyzeForm :model-value="username" @submit="handleSubmit" />

  <div class="flex flex-col gap-6 @container">
    <UserCard v-if="user" :user />
    <UserError v-else-if="error" :error />
    <UserAnalysisCard v-if="user" :user />
  </div>
</template>
