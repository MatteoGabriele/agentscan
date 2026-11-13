/** Site-wide head tags, shared by every layout. */
export function useAppHead() {
  const colorScheme = useColorScheme()

  useHead({
    title: 'AgentScan - GitHub Automation Detector',
    meta: [
      {
        property: 'og:title',
        content: 'AgentScan - GitHub Automation Detector',
      },
      {
        property: 'og:description',
        content: 'Automation pattern detection for open source maintainers',
      },
      { property: 'og:type', content: 'website' },
      {
        property: 'og:image',
        content: 'https://agentscan.tools/agentscan.png',
      },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'color-scheme', content: colorScheme },
    ],
    link: [
      {
        rel: 'icon',
        href: '/favicon.ico',
        type: 'image/x-icon',
        media: '(prefers-color-scheme: dark)',
      },
      {
        rel: 'icon',
        href: '/favicon-dark.ico',
        type: 'image/x-icon',
        media: '(prefers-color-scheme: light)',
      },
    ],
  })
}
