export type MenuDropdownItem = {
  to: string
  label: string
  description: string
  icon: string
  // Only active on this exact path, not on the pages nested below it.
  exact?: boolean
}
