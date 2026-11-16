import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { usePreviewList } from './usePreviewList'

describe('usePreviewList', () => {
  it('shows the first items and toggles the rest', () => {
    const { visibleItems, canToggle, toggleLabel, toggle } = usePreviewList(
      [1, 2, 3, 4],
      2,
    )

    expect(visibleItems.value).toEqual([1, 2])
    expect(canToggle.value).toBe(true)
    expect(toggleLabel.value).toBe('Show 2 more')

    toggle()

    expect(visibleItems.value).toEqual([1, 2, 3, 4])
    expect(toggleLabel.value).toBe('Show less')
  })

  it('has nothing to toggle when the list fits', () => {
    const { canToggle } = usePreviewList([1, 2], 2)

    expect(canToggle.value).toBe(false)
  })

  it('goes back to the preview when the list changes', async () => {
    const items = ref([1, 2, 3, 4])
    const { visibleItems, toggle } = usePreviewList(items, 2)

    toggle()
    items.value = [5, 6, 7]
    await nextTick()

    expect(visibleItems.value).toEqual([5, 6])
  })
})
