import { onClickOutside } from '@vueuse/core'
import type { ShallowRef } from 'vue'

type OpenSource = 'hover' | 'click' | 'keyboard'

const OPEN_DELAY = 100
const CLOSE_DELAY = 200

export function useNavMenu(root: Readonly<ShallowRef<HTMLElement | null>>) {
  const route = useRoute()
  const activeKey = ref<string | null>(null)
  const openedBy = ref<OpenSource | null>(null)
  const triggers = new Map<string, HTMLElement>()

  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let lastPointerType = 'mouse'

  function clearTimers() {
    clearTimeout(openTimer)
    clearTimeout(closeTimer)
  }

  function open(key: string, source: OpenSource) {
    clearTimers()
    activeKey.value = key
    openedBy.value = source
  }

  function close({ restoreFocus = false } = {}) {
    clearTimers()

    const key = activeKey.value
    activeKey.value = null
    openedBy.value = null

    if (restoreFocus && key) {
      triggers.get(key)?.focus()
    }
  }

  function scheduleClose() {
    clearTimeout(openTimer)

    if (openedBy.value !== 'hover') {
      return
    }

    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => close(), CLOSE_DELAY)
  }

  function setTrigger(key: string) {
    return (el: unknown) => {
      if (el instanceof HTMLElement) {
        triggers.set(key, el)
      } else {
        triggers.delete(key)
      }
    }
  }

  function getItems(): HTMLElement[] {
    if (!activeKey.value || !root.value) {
      return []
    }

    return Array.from(
      root.value.querySelectorAll<HTMLElement>(
        `[data-nav-panel="${activeKey.value}"] [data-nav-item]`,
      ),
    )
  }

  async function focusItem(position: 'first' | 'last') {
    await nextTick()

    const items = getItems()
    items[position === 'first' ? 0 : items.length - 1]?.focus()
  }

  function isPointerMouse(event: PointerEvent) {
    return event.pointerType === 'mouse'
  }

  function hoverHandlers(key: string) {
    return {
      onPointerenter(event: PointerEvent) {
        if (!isPointerMouse(event)) {
          return
        }

        clearTimeout(closeTimer)

        if (activeKey.value === key) {
          return
        }

        // Once a menu is open, moving to a sibling switches straight away.
        if (activeKey.value) {
          open(key, 'hover')
          return
        }

        clearTimeout(openTimer)
        openTimer = setTimeout(() => open(key, 'hover'), OPEN_DELAY)
      },
      onPointerleave(event: PointerEvent) {
        if (isPointerMouse(event)) {
          scheduleClose()
        }
      },
    }
  }

  function triggerHandlers(key: string) {
    return {
      onPointerdown(event: PointerEvent) {
        lastPointerType = event.pointerType
      },
      onClick(event: MouseEvent) {
        // Enter and Space dispatch a click with no pointer details.
        const isKeyboard = event.detail === 0

        if (activeKey.value === key) {
          // Hover already opened it, so a click means "keep this open" rather
          // than closing it from under the cursor.
          if (
            !isKeyboard &&
            lastPointerType === 'mouse' &&
            openedBy.value === 'hover'
          ) {
            openedBy.value = 'click'
            return
          }

          close()
          return
        }

        open(key, isKeyboard ? 'keyboard' : 'click')

        if (isKeyboard) {
          focusItem('first')
        }
      },
      onKeydown(event: KeyboardEvent) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
          return
        }

        event.preventDefault()
        open(key, 'keyboard')
        focusItem(event.key === 'ArrowDown' ? 'first' : 'last')
      },
    }
  }

  function onPanelKeydown(event: KeyboardEvent) {
    const items = getItems()
    const index = items.indexOf(document.activeElement as HTMLElement)

    if (index === -1) {
      return
    }

    const focusAt = (next: number) => {
      event.preventDefault()
      items[(next + items.length) % items.length]?.focus()
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        return focusAt(index + 1)
      case 'ArrowUp':
      case 'ArrowLeft':
        return focusAt(index - 1)
      case 'Home':
        return focusAt(0)
      case 'End':
        return focusAt(items.length - 1)
    }
  }

  const rootHandlers = {
    onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && activeKey.value) {
        event.preventDefault()
        close({ restoreFocus: true })
      }
    },
    onFocusout(event: FocusEvent) {
      const next = event.relatedTarget as Node | null

      if (next && !root.value?.contains(next)) {
        close()
      }
    },
  }

  onClickOutside(root, () => close())

  watch(
    () => route.fullPath,
    () => close(),
  )

  onBeforeUnmount(clearTimers)

  return {
    activeKey: readonly(activeKey),
    openedBy: readonly(openedBy),
    close,
    setTrigger,
    hoverHandlers,
    triggerHandlers,
    onPanelKeydown,
    rootHandlers,
  }
}
