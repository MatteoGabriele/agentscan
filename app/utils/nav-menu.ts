// @unocss-include
import type { MenuDropdownItem, MenuSection } from '~~/shared/types/menu'

export function isNavItemActive(
  path: string,
  { to, exact }: Pick<MenuDropdownItem, 'to' | 'exact'>,
) {
  return exact || to === '/' ? path === to : path.startsWith(to)
}

export function isExternalLink(to: string) {
  return to.startsWith('http')
}

const scanItems: MenuDropdownItem[] = [
  {
    to: '/',
    label: 'Account search',
    description: "Analyze a GitHub account's activity",
    icon: 'i-lucide:user-round',
  },
  {
    to: '/scan',
    label: 'Repository scan',
    description: 'Recent PR authors of any public repository',
    icon: 'i-lucide:book-search',
  },
  {
    to: 'https://text.agentscan.tools',
    label: 'Text scan',
    description: 'Find signs of AI-written text in open source contributions',
    icon: 'i-agentscan:text',
    badge: 'Beta',
  },
  {
    to: '/lab',
    label: 'The Lab',
    description: 'Experimental account scan mapping',
    icon: 'i-lucide:flask-conical',
  },
]

const activityItems: MenuDropdownItem[] = [
  {
    to: '/activity',
    label: 'Overview',
    description: 'Contribution patterns across the tracked repositories',
    icon: 'i-lucide:activity',
    exact: true,
  },
  {
    to: '/activity/repositories',
    label: 'Repositories',
    description: 'Browse the tracked repositories by category',
    icon: 'i-lucide:library',
  },
]

const communityItems: MenuDropdownItem[] = [
  {
    to: '/contribute',
    label: 'Contribute',
    description: 'Ways to help the AgentScan ecosystem',
    icon: 'i-lucide:book-heart',
  },
  {
    to: '/automations',
    label: 'Community reports',
    description: 'Accounts reported and reviewed by the community',
    icon: 'i-lucide:clipboard-pen',
  },
  {
    to: '/adopters',
    label: 'Used by',
    description: 'Public repositories running AgentScan on their CI',
    icon: 'i-lucide:heart-handshake',
  },
  {
    to: 'https://github.com/MatteoGabriele/agentscan',
    label: 'Source',
    description: 'Browse the code and open issues on GitHub',
    icon: 'i-lucide:code-xml',
  },
]

const installItems: MenuDropdownItem[] = [
  {
    to: '/app',
    label: 'GitHub App',
    description: 'Install on your repositories, no setup needed',
    icon: 'i-lucide:github',
  },
  {
    to: 'https://github.com/marketplace/actions/agentscan',
    label: 'GitHub Action',
    description: 'Run it in your own workflow',
    icon: 'i-lucide:workflow',
  },
  {
    to: '/app#configure',
    label: 'Configure',
    description: 'Labels, comments, auto-close and trusted users',
    icon: 'i-lucide:settings-2',
  },
]

/** Navigation sections, shared by the desktop and the mobile menu. */
export const NAV_SECTIONS: MenuSection[] = [
  { key: 'scan', label: 'Scan', items: scanItems },
  { key: 'activity', label: 'Ecosystem Activity', items: activityItems },
  { key: 'community', label: 'Community', items: communityItems },
  { key: 'install', label: 'Install AgentScan', items: installItems },
]
