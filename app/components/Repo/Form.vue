<script setup lang="ts">
const emit = defineEmits<{
  (e: 'submit', value: string): void
}>()

const repoInput = defineModel<string>({
  default: '',
})

const examples = [
  'nuxt/nuxt',
  'vuejs/core',
  'vitejs/vite',
  'facebook/react',
  'microsoft/typescript',
  'sveltejs/svelte',
]
const example = examples[Math.floor(Math.random() * examples.length)]
const placeholder = `e.g. https://github.com/${example} or ${example}`

function handleSubmit() {
  if (!repoInput.value) {
    return
  }

  emit('submit', repoInput.value)
}

const inputRef = useTemplateRef('inputRef')
function clear() {
  repoInput.value = ''
  inputRef.value?.focus()
}
</script>

<template>
  <form
    class="flex items-center gap-2 border border-gh-border/60 relative rounded-full pl-6 pr-4 py-3 focus-within:border-gh-border-light"
    @submit.prevent="handleSubmit"
  >
    <label class="flex-1" for="repoUrl">
      <span class="sr-only">Enter repository URL or owner/repo</span>
      <input
        id="repoUrl"
        ref="inputRef"
        v-model="repoInput"
        class="outline-none w-full placeholder:text-gh-muted/60"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        autocapitalize="none"
        :placeholder="placeholder"
      />
    </label>

    <div class="flex items-center gap-2">
      <button
        v-if="repoInput"
        type="button"
        class="flex rounded-full p-1.5 hover:bg-gh-muted/20 transition-all"
        @click="clear"
      >
        <span class="i-lucide:x" />
        <span class="sr-only">Clear input field</span>
      </button>

      <button
        type="submit"
        class="flex rounded-full p-1.5 hover:bg-gh-muted/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span class="i-lucide:scan-search" aria-hidden="true" />
        <span class="sr-only">Scan repository</span>
      </button>
    </div>
  </form>
</template>
