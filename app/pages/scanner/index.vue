<script setup lang="ts">
definePageMeta({
  layout: "minimal",
});

const owner = ref("");
const repo = ref("");

const router = useRouter();
function handleSubmit() {
  router.push(`/scanner/${owner.value}/${repo.value}`);
}
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center">
    <form @submit.prevent="handleSubmit" class="flex flex-col gap-6 w-full">
      <div class="flex gap-3 items-end">
        <div class="flex-1">
          <label class="text-sm mb-2 block" for="owner"> Owner </label>
          <input
            id="owner"
            type="text"
            required
            v-model="owner"
            placeholder="username"
            class="flex-1 w-full py-2 px-4 border-1 border-solid border-gh-border rounded-md bg-gh-card text-gh-text text-base outline-none focus:border-gh-blue"
          />
        </div>

        <div class="text-gh-text/40 mb-2">/</div>

        <div class="flex-1">
          <label class="text-sm mb-2 block" for="repo"> Repo </label>
          <input
            id="repo"
            type="text"
            required
            v-model="repo"
            placeholder="repo-name"
            class="flex-1 w-full py-2 px-4 border-1 border-solid border-gh-border rounded-md bg-gh-card text-gh-text text-base outline-none focus:border-gh-blue"
          />
        </div>
      </div>

      <button
        type="submit"
        class="py-2 px-6 bg-gh-green rounded-md text-white hover:bg-gh-green-hover flex justify-center items-center gap-2 font-mono"
      >
        <span class="i-carbon-search" aria-hidden="true" />
        Analyze
      </button>
    </form>

    <p class="text-sm text-gh-text/60 mt-6 mb-8 text-center">
      Enter a repository's owner and name separately. For example, for
      <span class="font-mono">nuxt/nuxt</span>, the owner is
      <span class="font-mono">nuxt</span> and the repository name is
      <span class="font-mono">nuxt</span>.
    </p>
  </div>
</template>
