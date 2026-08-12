// @unocss-include
import type { IdentityClassification } from '@unveil/identity'
import { SVG_ICON } from '~~/shared/utils/charts'

export type Landmark = {
  date: string
  name: string
  description: string
  icon: string
  iconSvg: string
  series?: IdentityClassification | typeof AUTOMATION_PR_CLOSURE_RATE
  offsetY?: number
}

/**
 * Temporary landmark for sample updates
 * We can remove it later if we don't notice any before/after trend shifts
 * The landmark is visible only when it is a day older than the last date of the dataset.
 */
export const landmarks: Landmark[] = [
  {
    date: '2026-07-01',
    name: 'Sample update',
    description: '16 repositories added to the dataset',
    icon: 'i-lucide:info', // for the tooltip
    iconSvg: SVG_ICON.info, // for the #svg slot
  },
  {
    date: '2026-07-18',
    name: 'Sample update',
    description: '16 repositories added to the dataset',
    icon: 'i-lucide:info',
    iconSvg: SVG_ICON.info,
  },

  {
    date: '2026-05-28',
    name: 'Opus 4.8',
    description:
      'Anthropic hit 61.4 on the Intelligence Index and 69.2% on SWE-Bench Pro, holding Opus 4.7 pricing at $5 / $25.',
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
    series: 'automation',
    offsetY: -16,
  },

  {
    date: '2026-06-12',
    name: 'Fable and Mythos ban',
    description:
      'A US export-control directive barred foreign-national access, pulling both models from general availability until July 1.',
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
    series: 'automation',
    offsetY: -16,
  },

  {
    date: '2026-06-26',
    name: 'GPT-5.6 preview',
    description:
      'OpenAI previewed a three-model series in a curated limited release. Sol flagship, Terra balanced, Luna fast and cheap.',
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
    series: 'automation',
    offsetY: -16,
  },

  {
    date: '2026-07-09',
    name: 'GPT-5.6',
    description:
      'OpenAI opened the Sol, Terra and Luna models to everyone after the June preview.',
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
    series: 'automation',
    offsetY: -16,
  },

  {
    date: '2026-07-24',
    name: 'Opus 5',
    description:
      'A more agentic model that gets close to Claude Fable 5 at half the price.',
    icon: 'i-lucide:newspaper',
    iconSvg: SVG_ICON.newspaper,
    series: 'automation',
    offsetY: -16,
  },

  {
    date: '2026-08-01',
    name: 'Library update',
    description:
      '@unveil/identity v2.0.0 brings better detection and a new "insufficient-data" classification, replacing the "organic" fallback used when data was too thin.',
    icon: 'i-lucide:shield-check',
    iconSvg: SVG_ICON.shieldCheck,
  },

  {
    date: '2026-08-11',
    name: 'Scan update',
    description:
      'Daily numbers are no longer a single random snapshot of the day. They are now derived from hourly scans across all 24 hours.',
    icon: 'i-lucide:info',
    iconSvg: SVG_ICON.info,
  },
]
