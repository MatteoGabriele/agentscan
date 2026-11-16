/**
 * A manual light/dark choice from the theme toggle lasts until the OS theme
 * changes, then the app goes back to following the system.
 */
export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      colorMode.preference = 'system'
    })
})
