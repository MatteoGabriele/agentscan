<script setup lang="ts">
const emit = defineEmits<{
  (e: 'submit', value: string): void
}>()

const { autofocus = false } = defineProps<{
  autofocus?: boolean
}>()

const accountName = defineModel<string>({
  default: '',
})

function handleSubmit() {
  if (!accountName.value) {
    return
  }

  emit('submit', accountName.value.toLowerCase())
}

const inputRef = useTemplateRef('inputRef')
function clear() {
  accountName.value = ''
  inputRef.value?.focus()
}
</script>

<template>
  <form
    class="flex items-center gap-2 mb-8 border border-gh-border/60 relative rounded-full pl-6 pr-4 py-3 focus-within:border-gh-border-light"
    @submit.prevent="handleSubmit"
  >
    <label class="flex-1" for="userName">
      <span class="sr-only">Enter account name</span>
      <input
        id="userName"
        ref="inputRef"
        v-model="accountName"
        class="outline-none w-full"
        :autofocus="autofocus"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        autocapitalize="none"
        name="userName"
        placeholder="Search accounts (e.g. torvalds)"
      />
    </label>
    <div class="flex items-center gap-2">
      <button
        v-if="accountName"
        type="button"
        class="flex rounded-full p-1.5 hover:bg-gh-muted/20 transition-all"
        @click="clear"
      >
        <span class="i-lucide:x" />
        <span class="sr-only">Clear input field</span>
      </button>

      <button
        type="submit"
        class="flex rounded-full p-1.5 hover:bg-gh-muted/20 transition-all"
      >
        <span class="i-lucide-search" aria-hidden="true" />
        <span class="sr-only">Analyze</span>
      </button>
    </div>
  </form>
</template>
