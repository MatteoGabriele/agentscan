import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/**
 * Shows the first `limit` items of a list, with a toggle to reveal the rest.
 * Goes back to the preview whenever the list itself changes.
 *
 * @example
 * const { visibleItems, canToggle, toggleLabel, toggle } =
 *   usePreviewList(() => props.events, 5)
 */
export function usePreviewList<T>(items: MaybeRefOrGetter<T[]>, limit: number) {
  const isShowingAll = ref(false)

  const visibleItems = computed<T[]>(() => {
    const all = toValue(items)
    return isShowingAll.value ? all : all.slice(0, limit)
  })

  const hiddenCount = computed<number>(() => {
    return toValue(items).length - visibleItems.value.length
  })

  const canToggle = computed<boolean>(() => toValue(items).length > limit)

  const toggleLabel = computed<string>(() => {
    return isShowingAll.value ? 'Show less' : `Show ${hiddenCount.value} more`
  })

  function toggle() {
    isShowingAll.value = !isShowingAll.value
  }

  watch(
    () => toValue(items),
    () => {
      isShowingAll.value = false
    },
  )

  return { visibleItems, canToggle, toggleLabel, toggle }
}
