import type { MenuDropdownItem } from '~~/shared/types/menu'

export function isNavItemActive(
  path: string,
  { to, exact }: Pick<MenuDropdownItem, 'to' | 'exact'>,
) {
  return exact || to === '/' ? path === to : path.startsWith(to)
}

export function isExternalLink(to: string) {
  return to.startsWith('http')
}
