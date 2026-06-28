import type { IdentityClassification } from '@unveil/identity'
import { parse as parseYaml } from 'yaml'

export type ScanMode = 'full' | 'labels' | 'comment' | 'silent'

export type RepoConfig = {
  'skip-members': string[]
  'auto-close': boolean
  'auto-close-classifications': IdentityClassification[]
  mode: ScanMode
  'skip-on-organic': boolean
  labels: {
    'community-flagged': string
    mixed: string
    automation: string
  }
  messages: {
    organic: string
    mixed: string
    automation: string
    'community-flagged': string
  }
}

export const DEFAULT_CONFIG: RepoConfig = {
  'skip-members': [],
  'auto-close': false,
  'auto-close-classifications': ['automation'],
  mode: 'full',
  'skip-on-organic': false,
  labels: {
    'community-flagged': 'agentscan:community-flagged',
    mixed: 'agentscan:mixed-signals',
    automation: 'agentscan:automated-account',
  },
  messages: {
    organic: '',
    mixed: '',
    automation: '',
    'community-flagged': '',
  },
}

export function parseRepoConfig(yamlContent: string): RepoConfig {
  const raw = parseYaml(yamlContent) as Partial<RepoConfig> | null

  if (raw == null) {
    return DEFAULT_CONFIG
  }

  return {
    ...DEFAULT_CONFIG,
    ...raw,
    labels: { ...DEFAULT_CONFIG.labels, ...raw.labels },
    messages: { ...DEFAULT_CONFIG.messages, ...raw.messages },
  }
}
