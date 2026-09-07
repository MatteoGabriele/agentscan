// @unocss-include
import type { IdentityClassification } from '@unveil/identity'
import { SVG_ICON } from '~~/shared/utils/charts'

export type Landmark = {
  date: string
  name: string
  description: string
  icon: string
  iconSvg: string
  series?: IdentityClassification
  offsetY?: number
}

/**
 * Temporary landmark for sample updates
 * We can remove it later if we don't notice any before/after trend shifts
 * The landmark is visible only when it is a day older than the last date of the dataset.
 */
export const landmarks: Landmark[] = [
  {
    date: '2026-08-10',
    name: 'Scan update',
    description:
      'Daily numbers are no longer a single random snapshot of the day. They are now derived from hourly scans across all 24 hours.',
    icon: 'i-lucide:info',
    iconSvg: SVG_ICON.info,
  },

  {
    date: '2026-08-15',
    name: 'Sample update',
    description: '32 repositories added to the dataset',
    icon: 'i-lucide:info',
    iconSvg: SVG_ICON.info,
  },

  {
    date: '2026-08-21',
    name: 'Sample update',
    description: '120 repositories added to the dataset',
    icon: 'i-lucide:info',
    iconSvg: SVG_ICON.info,
  },

  {
    date: '2026-09-04',
    name: 'Sample update',
    description: '200 repositories added to the dataset',
    icon: 'i-lucide:info',
    iconSvg: SVG_ICON.info,
  },

  {
    date: '2026-09-04',
    name: 'Astra release',
    description: "OpenAI's new frontier model.",
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
  },
]
