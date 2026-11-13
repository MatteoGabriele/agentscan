<script setup lang="ts">
import {
  parseSearchTarget,
  type SearchTarget,
} from '~~/shared/utils/parse-search-target'

const {
  autofocus = false,
  placeholder = 'GitHub username or owner/repo',
  examples = [],
} = defineProps<{
  autofocus?: boolean
  placeholder?: string
  // Shown while the field is empty, so a first visit has something to click.
  examples?: string[]
}>()

const query = defineModel<string>({ default: '' })

const id = useId()
const hintId = `${id}-hint`
const inputRef = useTemplateRef('inputRef')

const target = computed<SearchTarget | null>(() =>
  parseSearchTarget(query.value),
)

function routeFor(value: SearchTarget) {
  return value.kind === 'account'
    ? { name: 'user-name', params: { name: value.name } }
    : `/scan/${value.path}`
}

// The hint only speaks up when Enter would lead somewhere new: on a result
// page the field already holds that page's account or repository.
const route = useRoute()
const isNewTarget = computed<boolean>(() => {
  if (!target.value) {
    return true
  }

  const path =
    target.value.kind === 'account'
      ? `/user/${target.value.name}`
      : `/scan/${target.value.path}`

  return path.toLowerCase() !== route.path.toLowerCase()
})

function exampleTarget(example: string) {
  const value = parseSearchTarget(example)

  return value ? routeFor(value) : '/'
}

async function handleSubmit() {
  if (!target.value) {
    inputRef.value?.focus()
    return
  }

  await navigateTo(routeFor(target.value))
}

function clear() {
  query.value = ''
  inputRef.value?.focus()
}
</script>

<template>
  <form role="search" class="relative" @submit.prevent="handleSubmit">
    <div
      class="flex items-center gap-2 rounded-full border border-solid border-ui-border/60 py-1.5 pl-5 pr-1.5 transition-colors focus-within:border-ui-border-subtle"
    >
      <span
        class="shrink-0 text-sm text-ui-muted"
        :class="
          target?.kind === 'repository'
            ? 'i-lucide:book-search'
            : target?.kind === 'account'
              ? 'i-lucide:user-round'
              : 'i-lucide:search'
        "
        aria-hidden="true"
      />
      <label :for="id" class="sr-only">GitHub account or repository</label>
      <input
        :id
        ref="inputRef"
        v-model="query"
        class="min-w-0 flex-1 bg-transparent py-1.5 outline-none placeholder:text-ui-muted"
        :aria-describedby="query && isNewTarget ? hintId : undefined"
        :autofocus
        :placeholder
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        autocapitalize="none"
        enterkeyhint="search"
        data-1p-ignore
        data-bwignore
        data-lpignore="true"
        data-protonpass-ignore
        data-form-type="other"
      />

      <button
        v-if="query"
        type="button"
        class="flex rounded-full p-1.5 text-ui-muted transition-colors hover:bg-ui-muted/15 hover:text-ui-text"
        aria-label="Clear"
        @click="clear"
      >
        <span class="i-lucide:x" aria-hidden="true" />
      </button>

      <button
        type="submit"
        class="shrink-0 rounded-full px-3 py-1.5 text-sm text-ui-muted transition-colors hover:bg-ui-muted/15 hover:text-ui-text"
      >
        {{ target?.kind === 'repository' ? 'Scan' : 'Analyze' }}
      </button>
    </div>

    <!-- Says what Enter will do, so the two kinds of search never surprise.
      Out of the flow so it never adds space under the field. -->
    <p
      v-if="isNewTarget"
      :id="hintId"
      class="absolute inset-x-0 top-full mt-2 px-5 text-center text-xs text-ui-muted text-pretty"
    >
      <template v-if="target?.kind === 'account'">
        Checks the recent public activity of
        <span class="text-ui-text">@{{ target.name }}</span>
      </template>
      <template v-else-if="target?.kind === 'repository'">
        Checks the recent pull request authors of
        <span class="text-ui-text">{{ target.path }}</span>
      </template>
      <template v-else-if="query">
        Use a GitHub username, owner/repo, or a GitHub link
      </template>
      <template v-else-if="examples.length">
        Try
        <template v-for="(example, index) in examples" :key="example">
          <span v-if="index > 0"> or </span>
          <NuxtLink
            :to="exampleTarget(example)"
            class="underline underline-offset-2 hover:text-ui-text"
            >{{ example }}</NuxtLink
          >
        </template>
      </template>
    </p>
  </form>
</template>
