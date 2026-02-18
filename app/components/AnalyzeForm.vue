<script setup lang="ts">
const emit = defineEmits<{
  (e: "submit", value: string): void;
}>();

const accountName = defineModel<string>({
  default: "",
});

function handleSubmit() {
  emit("submit", accountName.value);
}
</script>

<template>
  <form
    @submit.prevent="handleSubmit"
    class="flex flex-col @md:flex-row gap-2 mb-8"
  >
    <label class="sr-only" for="userName">Enter GitHub username</label>
    <input
      v-model="accountName"
      id="userName"
      placeholder="Enter GitHub username..."
      class="flex-1 py-2 px-4 border-1 border-solid border-gh-border rounded-md bg-gh-card text-gh-text text-base outline-none focus:border-gh-blue"
    />

    <button
      type="submit"
      class="py-2 px-6 bg-gh-green rounded-md text-white cursor-pointer hover:bg-gh-green-hover flex justify-center items-center gap-2"
    >
      <span class="i-carbon-search" aria-hidden="true" />
      Analyze
    </button>
  </form>
</template>
