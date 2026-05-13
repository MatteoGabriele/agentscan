<script setup lang="ts">
import type { GitHubUser } from "@unveil/identity";

const { loggedIn, clear, openInPopup } = useUserSession();

const route = useRoute();
const repoName = computed<string>(() => {
  return route.params.name as string;
});
</script>

<template>
  <div v-if="loggedIn">
    <RepoList v-if="repoName" :repo="repoName" />

    <button @click="clear">Logout</button>
  </div>
  <div v-else>
    <h1>Not logged in</h1>
    <button @click="openInPopup('/auth/github')">Login with GitHub</button>
  </div>
</template>
