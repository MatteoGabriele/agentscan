export type EventTaxonomyItem = {
  name: string
  description: string
  color?: string
}

export type EventTaxonomy = Record<string, EventTaxonomyItem>

export type EventTaxonomyKey = keyof EventTaxonomy
