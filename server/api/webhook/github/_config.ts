import type { IdentityClassification } from '@unveil/identity'
import { parse as parseYaml } from 'yaml'

export type ScanMode = 'full' | 'labels' | 'comment' | 'silent'

export type AuthorAssociation =
  | 'collaborator'
  | 'contributor'
  | 'first_timer'
  | 'first_time_contributor'
  | 'member'
  | 'owner'

export const SUPPORTED_CONFIG_VERSION = 1

export type RepoConfig = {
  version: number
  'allowed-users': string[]
  'trusted-author-associations': AuthorAssociation[]
  'auto-close': boolean
  'auto-close-classifications': IdentityClassification[]
  mode: ScanMode
  'comment-on-organic': boolean
  scan: {
    'pull-requests': boolean
    issues: boolean
  }
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
  version: SUPPORTED_CONFIG_VERSION,
  'allowed-users': [],
  'trusted-author-associations': [],
  'auto-close': false,
  'auto-close-classifications': ['automation'],
  mode: 'full',
  'comment-on-organic': false,
  scan: {
    'pull-requests': true,
    issues: false,
  },
  labels: {
    'community-flagged': 'agentscan:community-flagged',
    mixed: 'agentscan:mixed-signals',
    automation: 'agentscan:automation-signals',
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

  const version = raw.version ?? SUPPORTED_CONFIG_VERSION

  if (version > SUPPORTED_CONFIG_VERSION) {
    console.warn(
      `[agentscan] agentscan.yml specifies version ${version}, but the installed app only supports up to version ${SUPPORTED_CONFIG_VERSION}. Falling back to defaults.`,
    )
    return DEFAULT_CONFIG
  }

  return {
    ...DEFAULT_CONFIG,
    ...raw,
    version,
    scan: { ...DEFAULT_CONFIG.scan, ...raw.scan },
    labels: { ...DEFAULT_CONFIG.labels, ...raw.labels },
    messages: { ...DEFAULT_CONFIG.messages, ...raw.messages },
  }
}
