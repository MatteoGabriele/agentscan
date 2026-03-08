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

const accountKey = computed<string>(() => `account:${username.value}`);
const { data: user, error } = await useFetch(
  () => `/api/account/${username.value}`,
  {
    key: accountKey,
    watch: [username],
  },
);

async function handleSubmit(name: string) {
  await router.push({ name: "user-name", params: { name } });
}

useSeoUser(user);
</script>

<template>
  <h1 class="sr-only">{{ username }} analysis page</h1>

  <AnalysisForm :model-value="username" @submit="handleSubmit" />

  <div class="flex flex-col gap-6 @container">
    <UserCard v-if="user" :user />
    <UserError v-else-if="error" :error />
    <AnalysisCard v-if="user" :user />
  </div>
</template>
