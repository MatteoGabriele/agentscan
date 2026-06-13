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
    class="flex items-center gap-2 mb-8 border border-gh-border relative rounded-full px-6 py-3 focus-within:border-gh-border-light"
  >
    <label class="flex-1" for="userName">
      <span class="sr-only">Enter account name</span>
      <input
        v-model="accountName"
        class="outline-none w-full"
        ref="inputRef"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        autocapitalize="none"
        name="userName"
        id="userName"
        placeholder="Search accounts (e.g. torvalds)"
      />
    </label>
    <div class="flex items-center gap-4">
      <button v-if="accountName" type="button" @click="clear" class="flex">
        <span class="i-lucide:x" />
        <span class="sr-only">Clear input field</span>
      </button>

      <button type="submit" class="flex">
        <span class="i-lucide-search" aria-hidden="true" />
        <span class="sr-only">Analyze</span>
      </button>
    </div>
  </form>
</template>
