<script setup lang="ts">
const route = useRoute();

const isPending = ref<boolean>(false);
async function handleSubmit() {
  isPending.value = true;
  const { url } = await $fetch("/api/auth/login", {
    method: "POST",
    body: {
      redirectTo: route.fullPath,
    },
  });
  window.location.href = url;
}

const emits = defineEmits(["close"]);
function closeModal() {
  emits("close");
}
</script>

<template>
  <Modal @close="closeModal">
    <div class="my-6 text-center">
      <h2 class="text-2xl font-semibold text-gh-text mb-1 font-mono">
        Sign in to AgentScan
      </h2>
      <p class="text-gh-muted text-sm">
        Connect with your
        <NuxtLink to="https://bsky.app" class="underline hover:text-gh-text"
          >Bluesky</NuxtLink
        >
        account
      </p>
    </div>
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
      <button
        type="submit"
        class="py-2 px-6 bg-gh-green rounded-md text-white hover:bg-gh-green-hover flex justify-center items-center gap-2 transition-colors font-mono"
      >
        <span
          v-if="isPending"
          class="i-carbon-circle-dash animate-spin text-lg"
        />
        <template v-else>
          <span class="i-carbon:logo-bluesky text-lg" aria-hidden="true" />
          Connect to Bluesky
        </template>
      </button>
    </form>
  </Modal>
</template>
