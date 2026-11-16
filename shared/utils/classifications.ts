// @unocss-include
import type { ClassificationLabel } from '@unveil/identity'
import type { ActivityCategory } from '../types/activity'

export const CLASSIFICATION_CATEGORIES = [
  'organic',
  'mixed',
  'automation',
] as const

/** The one place for the display name of each classification. */
export const CLASSIFICATION_NAMES: Record<ClassificationLabel, string> = {
  organic: 'Organic',
  mixed: 'Mixed',
  automation: 'Automation',
  'insufficient-data': 'Not enough data',
}

type NamedCategory = {
  name: string
  category: ActivityCategory
}

export const NAMED_CATEGORIES: NamedCategory[] = CLASSIFICATION_CATEGORIES.map(
  (category) => ({
    name: CLASSIFICATION_NAMES[category],
    category,
  }),
)

export const CLASSIFICATION_BG_CLASSES: Record<ActivityCategory, string> = {
  organic: 'bg-ui-organic',
  mixed: 'bg-ui-mixed',
  automation: 'bg-ui-automation',
}
