<script setup lang="ts">
definePageMeta({
  layout: "minimal",
});

const repositoryUrl = ref("");

const router = useRouter();
function handleSubmit() {
  // Extract owner/repo from URL or direct path
  const url = repositoryUrl.value.trim();

  // Handle both full URLs and owner/repo format
  let owner = "";
  let repo = "";

  if (url.includes("github.com")) {
    // Full GitHub URL: https://github.com/owner/repo
    const parts = url
      .replace("https://github.com/", "")
      .replace("http://github.com/", "")
      .split("/");
    owner = parts[0];
    repo = parts[1];
  } else {
    // Direct format: owner/repo
    const parts = url.split("/");
    owner = parts[0];
    repo = parts[1];
  }

  if (owner && repo) {
    router.push(`/scanner/${owner}/${repo}`);
  }
}
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center">
    <form
      @submit.prevent="handleSubmit"
      class="flex flex-col gap-6 w-full max-w-md"
    >
      <div>
        <label class="text-sm mb-2 block" for="repository"> Repository </label>
        <input
          id="repository"
          type="text"
          required
          v-model="repositoryUrl"
          placeholder="owner/repo or https://github.com/owner/repo"
          class="w-full py-2 px-4 border-1 border-solid border-gh-border rounded-md bg-gh-card text-gh-text text-base outline-none focus:border-gh-blue"
        />
      </div>

      <button
        type="submit"
        class="py-2 px-6 bg-gh-green rounded-md text-white hover:bg-gh-green-hover flex justify-center items-center gap-2 font-mono"
      >
        <span class="i-carbon-search" aria-hidden="true" />
        Analyze
      </button>
    </form>

    <p class="text-sm text-gh-text/60 mt-6 mb-8 text-center max-w-md">
      Enter a repository URL or the owner/repo format. For example:
      <span class="font-mono">nuxt/nuxt</span> or
      <span class="font-mono">https://github.com/nuxt/nuxt</span>.
    </p>
  </div>
</template>
