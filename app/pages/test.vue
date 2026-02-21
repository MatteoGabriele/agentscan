<script setup>
const { data: me } = await useFetch("/api/auth/me");

const githubUsername = "torvalds";
const status = ref("");

const { data: reactions, refresh } = await useFetch(
  `/api/reactions/${githubUsername}`,
);

const hasReacted = computed(() =>
  reactions.value?.some((r) => r.did === me.value?.user?.did),
);

async function react() {
  try {
    await $fetch("/api/reactions/create", {
      method: "POST",
      body: { githubUsername, reaction: "like" },
    });
    await refresh();
    status.value = "Flagged!";
  } catch (e) {
    if (e.status === 409) {
      status.value = "Already flagged";
    }
  }
}
</script>

<template>
  <div>
    <p v-if="me?.user">Logged in as {{ me.user.handle }}</p>
    <button v-if="me?.user" @click="react" :disabled="hasReacted">
      {{ hasReacted ? "🚩 Flagged" : "🚩 Flag" }}
    </button>
    <p>Flags: {{ reactions?.length ?? 0 }}</p>
    <div v-for="r in reactions" :key="r.did">
      <img
        v-if="r.avatar"
        :src="r.avatar"
        style="width: 24px; border-radius: 50%"
      />
      {{ r.displayName ?? r.handle }}
    </div>
    <p v-if="status">{{ status }}</p>
  </div>
</template>
