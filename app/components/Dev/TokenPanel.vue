<script setup lang="ts">
import {
  onClickOutside,
  onKeyStroke,
  useIntervalFn,
  useNow,
} from '@vueuse/core'
import type {
  DevTokenPanelConfig,
  DevTokenUsageResponse,
} from '~~/shared/types/dev-token-panel'
import { devTokenResources } from '~~/shared/types/dev-token-panel'

const config = useRuntimeConfig().public.devTokenPanel as DevTokenPanelConfig

const isOpen = ref(false)
const root = useTemplateRef<HTMLElement>('root')
const now = useNow({ interval: 1000 })

const { data, error, refresh, status } = useFetch<DevTokenUsageResponse>(
  '/api/_dev/github-tokens',
  { server: false },
)

const { pause } = useIntervalFn(() => refresh(), config.refreshInterval)

const hasTokens = computed<boolean>(() => Boolean(data.value?.tokens.length))

watch(data, (value) => {
  if (value && !value.tokens.length) {
    pause()
  }
})

onClickOutside(root, () => {
  isOpen.value = false
})
onKeyStroke('Escape', () => {
  isOpen.value = false
})

function share(used: number, limit: number): number {
  return limit ? used / limit : 0
}

function level(ratio: number): 'ok' | 'warn' | 'bad' {
  if (ratio >= 0.9) {
    return 'bad'
  }
  if (ratio >= 0.6) {
    return 'warn'
  }
  return 'ok'
}

const worst = computed<'ok' | 'warn' | 'bad' | 'error'>(() => {
  if (error.value || data.value?.tokens.some((token) => token.error)) {
    return 'error'
  }
  const ratios = (data.value?.tokens ?? []).flatMap((token) =>
    Object.values(token.resources).map(({ used, limit }) => share(used, limit)),
  )
  return level(Math.max(0, ...ratios))
})

function resetsIn(reset: number): string {
  const seconds = Math.max(0, Math.round(reset - now.value.getTime() / 1000))
  const minutes = Math.floor(seconds / 60)
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}

const positionClass = {
  'bottom-right': 'bottom-4 right-4 items-end flex-col-reverse',
  'bottom-left': 'bottom-4 left-4 items-start flex-col-reverse',
  'top-right': 'top-4 right-4 items-end flex-col',
  'top-left': 'top-4 left-4 items-start flex-col',
}[config.position]
</script>

<template>
  <div
    v-if="hasTokens || error"
    ref="root"
    class="fixed z-100 flex gap-2"
    :class="positionClass"
  >
    <button
      type="button"
      class="relative grid size-[50px] place-items-center rounded-full border-1 border-solid border-ui-border bg-ui-card text-ui-text shadow-lg transition-colors hover:bg-ui-muted/15"
      :aria-expanded="isOpen"
      aria-controls="dev-token-panel"
      aria-label="GitHub token usage (dev)"
      title="GitHub token usage (dev)"
      @click="isOpen = !isOpen"
    >
      <span class="i-lucide:gauge size-5" aria-hidden="true" />
      <span
        class="absolute right-1 top-1 size-2.5 rounded-full border-2 border-solid border-ui-card"
        :class="`dot-${worst}`"
        aria-hidden="true"
      />
    </button>

    <section
      v-if="isOpen"
      id="dev-token-panel"
      class="max-h-[70svh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border-1 border-solid border-ui-border bg-ui-card p-4 text-sm shadow-xl"
    >
      <header class="mb-3 flex items-center justify-between gap-2">
        <h2 class="font-semibold">GitHub tokens</h2>
        <button
          type="button"
          class="grid size-7 place-items-center rounded-full text-ui-muted hover:bg-ui-muted/10 hover:text-ui-text"
          aria-label="Refresh"
          title="Refresh"
          @click="refresh()"
        >
          <span
            class="i-lucide:refresh-cw size-3.5"
            :class="{ 'animate-spin': status === 'pending' }"
            aria-hidden="true"
          />
        </button>
      </header>

      <p v-if="error" class="text-ui-automation">
        Failed to load: {{ error.message }}
      </p>
      <ul v-else-if="data" class="flex flex-col gap-4">
        <li v-for="token in data.tokens" :key="token.name">
          <div class="mb-1.5 break-all font-mono text-xs">
            {{ token.name }}
          </div>

          <p v-if="token.error" class="text-xs text-ui-automation">
            {{ token.error }}
          </p>

          <template v-for="key in devTokenResources" v-else :key="key">
            <div
              v-if="token.resources[key]"
              class="grid grid-cols-[3.5rem_1fr_auto] items-center gap-x-2 text-xs"
            >
              <span class="text-ui-muted">{{ key }}</span>
              <div class="h-1.5 overflow-hidden rounded-full bg-ui-muted/20">
                <div
                  class="h-full"
                  :class="`bar-${level(share(token.resources[key].used, token.resources[key].limit))}`"
                  :style="{
                    width: `${share(token.resources[key].used, token.resources[key].limit) * 100}%`,
                  }"
                />
              </div>
              <span class="tabular-nums">
                {{ token.resources[key].used.toLocaleString() }} /
                {{ token.resources[key].limit.toLocaleString() }}
              </span>
              <span
                class="col-start-2 col-end-4 mb-1 text-[11px] text-ui-muted"
              >
                resets in {{ resetsIn(token.resources[key].reset) }}
              </span>
            </div>
          </template>
        </li>
      </ul>

      <p v-else class="text-ui-muted">Loading…</p>

      <footer v-if="data" class="mt-3 text-[11px] text-ui-muted">
        Updated {{ new Date(data.fetchedAt).toLocaleTimeString() }} · dev only
      </footer>
    </section>
  </div>
</template>

<style scoped>
.dot-ok,
.bar-ok {
  background: var(--organic);
}

.dot-warn,
.bar-warn {
  background: var(--mixed);
}

.dot-bad,
.bar-bad,
.dot-error {
  background: var(--automation);
}
</style>
