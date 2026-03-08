<script setup lang="ts">
const emit = defineEmits<{
  (e: "submit", value: string): void;
}>();

const accountName = defineModel<string>({
  default: "",
});

function handleSubmit() {
  if (!accountName.value) {
    return;
  }

  emit("submit", accountName.value.toLowerCase());
}

const inputRef = useTemplateRef("inputRef");
function clear() {
  accountName.value = "";
  inputRef.value?.focus();
}
</script>

<template>
  <form
    @submit.prevent="handleSubmit"
    class="flex flex-col @md:flex-row gap-2 mb-8"
  >
    <div class="w-full relative">
      <label class="sr-only" for="userName">Enter GitHub username</label>
      <input
        v-model="accountName"
        ref="inputRef"
        autocomplete="off"
        id="userName"
        placeholder="Enter GitHub username..."
        class="flex-1 w-full py-2 px-4 pr-8 border-1 border-solid border-gh-border rounded-md bg-gh-card text-gh-text text-base outline-none focus:border-gh-blue"
      />
      <button
        v-if="accountName"
        type="button"
        @click="clear"
        class="absolute rounded-full hover:bg-gh-muted/30 transition-colors size-6 items-center justify-center text-gh-text flex top-1/2 right-2 -translate-y-1/2"
      >
        <span class="i-carbon:close" />
      </button>
    </div>

    <button
      type="submit"
      class="py-2 px-6 bg-gh-green rounded-md text-white hover:bg-gh-green-hover flex justify-center items-center gap-2 font-mono"
    >
      <span class="i-carbon-search" aria-hidden="true" />
      Analyze
    </button>
  </form>
</template>
