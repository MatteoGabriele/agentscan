// @unocss-include
import type { ClassificationLabel } from '@unveil/identity'
import { SVG_ICON } from '~~/shared/utils/charts'

export type Landmark = {
  date: string
  name: string
  description: string
  icon: string
  iconSvg: string
  series?: ClassificationLabel
  offsetY?: number
  /** Puts the label above the bottom-row icon instead of under it, for crowded days. */
  labelAbove?: boolean
}

/**
 * Temporary landmark for the sample update; remove if no trend shift shows up.
 * Shown once it is a day older than the last date of the dataset.
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
    name: 'Astra',
    description: "OpenAI's new frontier model.",
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
  },

  {
    date: '2026-09-22',
    name: 'Opus 5.5',
    description: "New version of Anthropic's Opus model.",
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
  },
  {
    date: '2026-10-10',
    name: 'SWE-2',
    description: "Cognition's new frontier model.",
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
  },
  {
    date: '2026-10-12',
    name: 'Muse',
    description: "Meta's new frontier model.",
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
    labelAbove: true,
  },
  {
    date: '2026-10-13',
    name: 'Argon',
    description: "Google's new frontier model.",
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
  },
  {
    date: '2026-10-31',
    name: 'Possible spike drivers',
    description:
      'GitHub launched Copilot Fusion at Universe (Oct 28), Mistral released Mistral Large 4 (Oct 29), and Hacktoberfest ended (Oct 31).',
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
  },
]
