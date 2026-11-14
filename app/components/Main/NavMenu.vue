<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import type { MenuDropdownItem, MenuSection } from '~~/shared/types/menu'

defineProps<{
  sections: MenuSection[]
}>()

type Placement = {
  shift: number
  maxHeight: number
}

const VIEWPORT_MARGIN = 16
const PANEL_OFFSET = 8
const MIN_PANEL_HEIGHT = 160
const ALIGN_OFFSET = -5

const route = useRoute()
const root = useTemplateRef<HTMLElement>('root')
const menu = useNavMenu(root)
const { activeKey } = menu

// Kept per section so a closing panel doesn't jump while it fades out.
const placements = ref<Record<string, Placement>>({})
const previewTo = ref<string | null>(null)

function isSectionActive(items: MenuDropdownItem[]) {
  return items.some((item) => isNavItemActive(route.path, item))
}

// Hovered or focused item, otherwise the current page, otherwise the first.
function previewItem(items: MenuDropdownItem[]) {
  return (
    items.find((item) => item.to === previewTo.value) ??
    items.find((item) => isNavItemActive(route.path, item)) ??
    items[0]
  )
}

function linkHost(to: string) {
  return new URL(to).host
}

/**
 * Opens the panel straight below its trigger, with the item list under the
 * label so the pointer only has to move down, then nudges it sideways and caps
 * its height so it stays inside the window.
 */
async function placePanel() {
  const key = activeKey.value

  if (!key) {
    return
  }

  await nextTick()

  const panel = root.value?.querySelector<HTMLElement>(
    `[data-nav-panel="${key}"]`,
  )
  const anchor = panel?.parentElement

  if (!panel || !anchor) {
    return
  }

  const { clientWidth, clientHeight } = document.documentElement
  const anchorRect = anchor.getBoundingClientRect()
  const width = panel.offsetWidth
  const alignedLeft = anchorRect.left + ALIGN_OFFSET
  const left = Math.min(
    Math.max(alignedLeft, VIEWPORT_MARGIN),
    clientWidth - VIEWPORT_MARGIN - width,
  )

  placements.value[key] = {
    shift: left - alignedLeft,
    maxHeight: Math.max(
      clientHeight - anchorRect.bottom - PANEL_OFFSET - VIEWPORT_MARGIN,
      MIN_PANEL_HEIGHT,
    ),
  }
}

function panelStyle(key: string) {
  const placement = placements.value[key]

  return { left: `${ALIGN_OFFSET + (placement?.shift ?? 0)}px` }
}

function cardStyle(key: string) {
  const placement = placements.value[key]

  return placement ? { maxHeight: `${placement.maxHeight}px` } : {}
}

watch(activeKey, () => {
  previewTo.value = null
  placePanel()
})

useEventListener('resize', placePanel, { passive: true })
</script>

<template>
  <nav ref="root" aria-label="Main" v-bind="menu.rootHandlers">
    <ul class="flex items-center gap-0.5">
      <li
        v-for="section in sections"
        :key="section.key"
        class="relative"
        v-bind="'items' in section ? menu.hoverHandlers(section.key) : {}"
      >
        <MainMenuItem
          v-if="'to' in section"
          :to="section.to"
          :label="section.label"
          class="px-3 py-1.5"
        />

        <template v-else>
          <button
            :ref="menu.setTrigger(section.key)"
            type="button"
            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:text-ui-text"
            :class="
              activeKey === section.key
                ? 'bg-ui-muted/10 text-ui-text'
                : isSectionActive(section.items)
                  ? 'text-ui-text'
                  : 'text-ui-muted'
            "
            :aria-expanded="activeKey === section.key"
            :aria-controls="`nav-panel-${section.key}`"
            v-bind="menu.triggerHandlers(section.key)"
          >
            {{ section.label }}
            <span
              class="i-lucide:chevron-down text-xs opacity-60 transition-transform duration-200"
              :class="{ 'rotate-180': activeKey === section.key }"
              aria-hidden="true"
            ></span>
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
            enter-from-class="opacity-0 translate-y-1"
            leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
            leave-to-class="opacity-0"
          >
            <!-- The top padding bridges the gap so the pointer can cross it. -->
            <div
              v-if="activeKey === section.key"
              :id="`nav-panel-${section.key}`"
              :data-nav-panel="section.key"
              class="absolute top-full z-50 pt-2"
              :style="panelStyle(section.key)"
              @keydown="menu.onPanelKeydown"
            >
              <div
                class="flex w-[32rem] max-w-[calc(100vw-2rem)] gap-1.5 overflow-y-auto overscroll-contain rounded-3 border border-solid border-ui-border/50 bg-ui-card p-1.5 shadow-lg shadow-black/10"
                :style="cardStyle(section.key)"
              >
                <ul class="flex w-48 shrink-0 flex-col gap-0.5">
                  <li v-for="item in section.items" :key="item.to">
                    <NuxtLink
                      :to="item.to"
                      data-nav-item
                      class="flex items-center gap-2.5 rounded-2 px-2.5 py-2 text-sm outline-none transition-colors"
                      :class="
                        previewItem(section.items) === item
                          ? 'bg-ui-muted/10 text-ui-text'
                          : 'text-ui-muted'
                      "
                      :aria-current="
                        isNavItemActive(route.path, item) ? 'page' : undefined
                      "
                      @pointerenter="previewTo = item.to"
                      @focus="previewTo = item.to"
                    >
                      <span
                        class="shrink-0"
                        :class="item.icon"
                        aria-hidden="true"
                      ></span>
                      <span class="truncate">{{ item.label }}</span>
                      <span
                        v-if="item.badge"
                        class="shrink-0 px-1.5 py-0.5 rounded-full border border-solid border-ui-border text-10px font-medium uppercase tracking-wider text-ui-muted leading-none"
                        >{{ item.badge }}</span
                      >
                      <span
                        v-if="isExternalLink(item.to)"
                        class="i-lucide:arrow-up-right ml-auto shrink-0 text-[0.75em] opacity-70"
                        aria-hidden="true"
                      ></span>
                      <span
                        v-else-if="isNavItemActive(route.path, item)"
                        class="ml-auto size-1.5 shrink-0 rounded-full bg-ui-muted"
                        aria-hidden="true"
                      ></span>
                    </NuxtLink>
                  </li>
                </ul>

                <!-- Visual preview only: each link already carries its label. -->
                <div
                  class="relative min-h-40 flex-1 overflow-hidden rounded-2 bg-ui-bg/60"
                  aria-hidden="true"
                >
                  <Transition
                    enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
                    enter-from-class="opacity-0 translate-y-0.5"
                    leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
                    leave-to-class="opacity-0"
                  >
                    <div
                      :key="previewItem(section.items)?.to"
                      class="absolute inset-0 flex flex-col p-4"
                    >
                      <span
                        class="text-lg text-ui-muted"
                        :class="previewItem(section.items)?.icon"
                      ></span>
                      <p class="mt-auto text-sm text-ui-text">
                        {{ previewItem(section.items)?.label }}
                      </p>
                      <p
                        class="mt-1 text-xs leading-relaxed text-ui-muted text-pretty"
                      >
                        {{ previewItem(section.items)?.description }}
                      </p>
                      <p
                        v-if="
                          isExternalLink(previewItem(section.items)?.to ?? '')
                        "
                        class="mt-2 text-xs text-ui-muted/70"
                      >
                        Opens {{ linkHost(previewItem(section.items)!.to) }}
                      </p>
                    </div>
                  </Transition>
                </div>
              </div>
            </div>
          </Transition>
        </template>
      </li>
    </ul>
  </nav>
</template>
