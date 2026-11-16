import { usePreferredDark } from '@vueuse/core'

const FORCED_SCHEMES: Record<string, string> = {
  light: 'only light',
  dark: 'only dark',
}

/**
 * Value for the `color-scheme` meta tag, derived from the color mode preference.
 * Falls back to the system preference for `system` or any unknown value.
 */
export function useColorScheme() {
  const prefersDark = usePreferredDark()
  const colorMode = useColorMode()

  return computed(() => {
    return (
      FORCED_SCHEMES[colorMode.preference] ??
      (prefersDark.value ? 'dark light' : 'light dark')
    )
  })
}
