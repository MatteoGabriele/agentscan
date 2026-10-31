<script setup lang="ts">
import {
  MESSAGE_PLACEHOLDERS,
  type MessagePlaceholder,
} from '~~/shared/utils/agentscan-messages'

const props = defineProps<{
  defaultMessage: string
  placeholders?: MessagePlaceholder[]
}>()

const model = defineModel<string>({ default: '' })

const editor = useTemplateRef('editor')

const isCustom = computed(() => model.value.trim() !== '')

const tokens = computed(() =>
  (props.placeholders ?? []).map((key) => ({
    key,
    token: `{${key}}`,
    hint: MESSAGE_PLACEHOLDERS[key],
  })),
)
</script>

<template>
  <div class="flex flex-col gap-3 min-w-0">
    <div
      class="rounded border border-dashed border-ui-border/60 px-3 py-2.5 transition-opacity"
      :class="{ 'opacity-60': isCustom }"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-medium text-ui-muted">
          {{ isCustom ? 'Default (replaced by yours)' : 'Sent by default' }}
        </p>
        <button
          v-if="isCustom"
          type="button"
          class="text-xs text-ui-muted underline hover:text-ui-text"
          @click="model = ''"
        >
          Use default
        </button>
        <button
          v-else
          type="button"
          class="text-xs text-ui-muted underline hover:text-ui-text"
          @click="model = defaultMessage"
        >
          Edit a copy
        </button>
      </div>
      <p
        class="mt-1.5 text-sm font-mono text-ui-text/90 whitespace-pre-wrap break-words"
      >
        {{ defaultMessage }}
      </p>
    </div>

    <CommonMarkdownEditor
      ref="editor"
      v-model="model"
      placeholder="Write your own message, or leave empty to send the default."
    />

    <div
      v-if="tokens.length > 0"
      class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs"
    >
      <span class="text-ui-muted">Insert:</span>
      <span
        v-for="item in tokens"
        :key="item.key"
        class="flex items-center gap-1.5"
      >
        <button
          type="button"
          class="font-mono px-1.5 py-0.5 rounded border border-ui-border/60 text-ui-text/90 hover:bg-ui-muted/20 hover:text-ui-text transition-colors"
          @click="editor?.insert(item.token)"
        >
          {{ item.token }}
        </button>
        <span class="text-ui-muted">{{ item.hint }}</span>
      </span>
    </div>
  </div>
</template>
