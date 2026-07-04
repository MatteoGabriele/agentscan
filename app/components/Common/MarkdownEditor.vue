<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Text from '@tiptap/extension-text'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown, type MarkdownStorage } from 'tiptap-markdown'

// Typed text is treated as markdown source (e.g. a
// pasted image URL like `![](...)` shouldn't come out as `!\[\]\(...\)`).
const RawText = Text.extend({
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { text: (text: string, escape?: boolean) => void },
          node: { text?: string },
        ) {
          state.text(node.text ?? '', false)
        },
      },
    }
  },
})

const props = defineProps<{
  placeholder?: string
}>()

const modelValue = defineModel<string>({ default: '' })

const updateTick = ref(0)

function getMarkdown(instance: Editor) {
  const storage = instance.storage as unknown as { markdown: MarkdownStorage }
  return storage.markdown.getMarkdown()
}

const editor = useEditor({
  content: modelValue.value,
  extensions: [
    StarterKit,
    RawText,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder: props.placeholder ?? '' }),
    Markdown.configure({ html: false }),
  ],
  onUpdate: ({ editor: instance }) => {
    modelValue.value = getMarkdown(instance)
  },
  onTransaction: () => {
    updateTick.value++
  },
})

watch(modelValue, (value) => {
  if (!editor.value) {
    return
  }

  const current = getMarkdown(editor.value)
  if (value !== current) {
    editor.value.commands.setContent(value, { emitUpdate: false })
  }
})

function isActive(name: string) {
  void updateTick.value
  return editor.value?.isActive(name) ?? false
}

function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleBulletList() {
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  editor.value?.chain().focus().toggleOrderedList().run()
}

function setLink() {
  if (!editor.value) {
    return
  }

  const previousUrl = editor.value.getAttributes('link').href as
    | string
    | undefined
  const url = window.prompt('URL', previousUrl ?? '')

  if (url === null) {
    return
  }

  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  editor.value
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url })
    .run()
}
</script>

<template>
  <div
    class="min-w-0 border border-gh-border/60 rounded overflow-hidden focus-within:border-gh-border-light"
  >
    <div
      class="flex items-center gap-0.5 px-1.5 py-1 border-b border-gh-border/60 bg-gh-muted/10"
    >
      <button
        type="button"
        class="p-1.5 rounded hover:bg-gh-muted/20"
        :class="{ 'bg-gh-muted/30 text-gh-text': isActive('bold') }"
        @mousedown.prevent="toggleBold"
      >
        <span class="i-lucide:bold text-sm" aria-hidden="true" />
        <span class="sr-only">Bold</span>
      </button>
      <button
        type="button"
        class="p-1.5 rounded hover:bg-gh-muted/20"
        :class="{ 'bg-gh-muted/30 text-gh-text': isActive('italic') }"
        @mousedown.prevent="toggleItalic"
      >
        <span class="i-lucide:italic text-sm" aria-hidden="true" />
        <span class="sr-only">Italic</span>
      </button>
      <button
        type="button"
        class="p-1.5 rounded hover:bg-gh-muted/20"
        :class="{ 'bg-gh-muted/30 text-gh-text': isActive('bulletList') }"
        @mousedown.prevent="toggleBulletList"
      >
        <span class="i-lucide:list text-sm" aria-hidden="true" />
        <span class="sr-only">Bullet list</span>
      </button>
      <button
        type="button"
        class="p-1.5 rounded hover:bg-gh-muted/20"
        :class="{ 'bg-gh-muted/30 text-gh-text': isActive('orderedList') }"
        @mousedown.prevent="toggleOrderedList"
      >
        <span class="i-lucide:list-ordered text-sm" aria-hidden="true" />
        <span class="sr-only">Numbered list</span>
      </button>
      <button
        type="button"
        class="p-1.5 rounded hover:bg-gh-muted/20"
        :class="{ 'bg-gh-muted/30 text-gh-text': isActive('link') }"
        @mousedown.prevent="setLink"
      >
        <span class="i-lucide:link text-sm" aria-hidden="true" />
        <span class="sr-only">Link</span>
      </button>
    </div>

    <EditorContent
      :editor="editor"
      class="markdown-editor-content px-3 py-2 text-sm text-gh-text"
    />
  </div>
</template>

<style scoped>
:deep(.tiptap) {
  outline: none;
  min-height: 7rem;
  overflow-wrap: break-word;
}

:deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: var(--text-muted);
}

:deep(.tiptap ul) {
  list-style: disc;
  padding-left: 1.25rem;
}

:deep(.tiptap ol) {
  list-style: decimal;
  padding-left: 1.25rem;
}

:deep(.tiptap a) {
  text-decoration: underline;
}
</style>
