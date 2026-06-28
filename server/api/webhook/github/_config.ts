import type { IdentityClassification } from '@unveil/identity'
import { parse as parseYaml } from 'yaml'

export type ScanMode = 'full' | 'labels' | 'comment' | 'silent'

export type RepoConfig = {
  skipMembers: string[]
  autoClose: boolean
  autoCloseClassifications: IdentityClassification[]
  mode: ScanMode
  skipOnOrganic: boolean
  labels: {
    communityFlagged: string
    mixed: string
    automation: string
  }
  messages: {
    organic: string
    mixed: string
    automation: string
    communityFlagged: string
  }
}

type PartialRepoConfig = {
  skipMembers?: string[]
  autoClose?: boolean
  autoCloseClassifications?: IdentityClassification[]
  mode?: ScanMode
  skipOnOrganic?: boolean
  labels?: Partial<RepoConfig['labels']>
  messages?: Partial<RepoConfig['messages']>
}

type RawYamlConfig = {
  'skip-members'?: string[]
  'skip-on-organic'?: boolean
  'auto-close'?: boolean
  'auto-close-classifications'?: IdentityClassification[]
  mode?: ScanMode
  labels?: Partial<Record<Exclude<IdentityClassification, 'organic'>, string>> & {
    'community-flagged'?: string
  }
  messages?: Partial<Record<IdentityClassification, string>> & { 'community-flagged'?: string }
}

export const DEFAULT_CONFIG: RepoConfig = {
  skipMembers: [],
  autoClose: false,
  autoCloseClassifications: ['automation'],
  mode: 'full',
  skipOnOrganic: false,
  labels: {
    communityFlagged: 'agentscan:community-flagged',
    mixed: 'agentscan:mixed-signals',
    automation: 'agentscan:automated-account',
  },
  messages: {
    organic: '',
    mixed: '',
    automation: '',
    communityFlagged: '',
  },
}

function normalizeConfig(raw: RawYamlConfig): PartialRepoConfig {
  const result: PartialRepoConfig = {}
  if (raw['skip-members'] !== undefined) {
    result.skipMembers = raw['skip-members']
  }
  if (raw['skip-on-organic'] !== undefined) {
    result.skipOnOrganic = raw['skip-on-organic']
  }
  if (raw['auto-close'] !== undefined) {
    result.autoClose = raw['auto-close']
  }
  if (raw['auto-close-classifications'] !== undefined) {
    result.autoCloseClassifications = raw['auto-close-classifications']
  }
  if (raw.mode !== undefined) {
    result.mode = raw.mode
  }
  if (raw.labels) {
    const { 'community-flagged': communityFlagged, ...rest } = raw.labels
    result.labels = { ...rest, ...(communityFlagged !== undefined ? { communityFlagged } : {}) }
  }
  if (raw.messages) {
    const { 'community-flagged': communityFlagged, ...rest } = raw.messages
    result.messages = { ...rest, ...(communityFlagged !== undefined ? { communityFlagged } : {}) }
  }
  return result
}

export function parseRepoConfig(yamlContent: string): RepoConfig {
  const parsed = normalizeConfig(parseYaml(yamlContent) as RawYamlConfig)
  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    labels: { ...DEFAULT_CONFIG.labels, ...parsed.labels },
    messages: { ...DEFAULT_CONFIG.messages, ...parsed.messages },
  }
}
