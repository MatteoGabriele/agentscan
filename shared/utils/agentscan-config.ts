import { Document, isMap, isScalar, stringify } from 'yaml'
import type { ActionReleasesResponse } from '../types/action-release'

/**
 * Turns the config generator's settings into the GitHub App's
 * `.github/agentscan.yml` or a GitHub Action workflow, listing only what
 * differs from each platform's defaults.
 */

export type Platform = 'app' | 'action'

export type ScanMode = 'full' | 'comment' | 'labels' | 'silent'

export type AuthorAssociation =
  | 'collaborator'
  | 'contributor'
  | 'first_timer'
  | 'first_time_contributor'
  | 'member'
  | 'owner'

// Includes community-flagged: not an analysis result, but it has its own
// title, comment and label.
export type Classification =
  'organic' | 'mixed' | 'automation' | 'community-flagged' | 'insufficient-data'

export type LabelledClassification =
  'mixed' | 'automation' | 'community-flagged'

export type ConfigSettings = {
  mode: ScanMode
  scanPullRequests: boolean
  scanIssues: boolean
  allowedUsers: string[]
  trustedAuthorAssociations: AuthorAssociation[]
  commentOnOrganic: boolean
  autoClose: boolean
  autoCloseClassifications: Classification[]
  honeypot: boolean
  /** Action only: keeps analysis results between workflow runs. */
  cache: boolean
  labels: Record<LabelledClassification, string>
  messages: Record<Classification, string>
  messageHoneypot: string
  messageHoneypotFirstTime: string
}

export const DEFAULT_LABELS: Record<
  Platform,
  Record<LabelledClassification, string>
> = {
  app: {
    mixed: 'agentscan:mixed-signals',
    automation: 'agentscan:automation-signals',
    'community-flagged': 'agentscan:community-flagged',
  },
  action: {
    mixed: 'agentscan:mixed-signals',
    automation: 'agentscan:automated-account',
    'community-flagged': 'agentscan:community-flagged',
  },
}

/**
 * Options for `auto-close-classifications`. Community-flagged accounts are
 * always closed when auto-close is on.
 */
export const AUTO_CLOSE_OPTIONS: Record<Platform, Classification[]> = {
  app: ['organic', 'mixed', 'automation'],
  // The action drops anything else from the list.
  action: ['mixed', 'automation'],
}

export const DEFAULT_AUTO_CLOSE_CLASSIFICATIONS: Classification[] = [
  'automation',
]

/** Results whose comment can be replaced. The rest always post the default. */
export const CUSTOMIZABLE_MESSAGES: Record<Platform, Classification[]> = {
  app: [
    'organic',
    'mixed',
    'automation',
    'community-flagged',
    'insufficient-data',
  ],
  action: ['organic', 'mixed', 'automation', 'community-flagged'],
}

export const ACTION_CACHE_PATH = '.agentscan-cache'

const LABEL_ORDER: LabelledClassification[] = [
  'community-flagged',
  'mixed',
  'automation',
]

function sameMembers<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item))
}

function getAutoCloseClassifications(
  settings: ConfigSettings,
  platform: Platform,
): Classification[] | null {
  const accepted = settings.autoCloseClassifications.filter((item) =>
    AUTO_CLOSE_OPTIONS[platform].includes(item),
  )

  return sameMembers(accepted, DEFAULT_AUTO_CLOSE_CLASSIFICATIONS)
    ? null
    : accepted
}

function getCustomLabels(settings: ConfigSettings, platform: Platform) {
  return LABEL_ORDER.filter(
    (key) => settings.labels[key] !== DEFAULT_LABELS[platform][key],
  ).map((key) => ({ key, value: settings.labels[key] }))
}

function getCustomMessages(settings: ConfigSettings, platform: Platform) {
  return CUSTOMIZABLE_MESSAGES[platform]
    .filter((key) => settings.messages[key] !== '')
    .map((key) => ({ key, value: settings.messages[key] }))
}

export function buildAppConfig(settings: ConfigSettings): string {
  const config: Record<string, unknown> = { version: 1 }

  const scan: Record<string, boolean> = {}
  if (!settings.scanPullRequests) {
    scan['pull-requests'] = false
  }
  if (settings.scanIssues) {
    scan.issues = true
  }
  if (Object.keys(scan).length > 0) {
    config.scan = scan
  }

  if (settings.allowedUsers.length > 0) {
    config['allowed-users'] = settings.allowedUsers
  }

  if (settings.trustedAuthorAssociations.length > 0) {
    config['trusted-author-associations'] = settings.trustedAuthorAssociations
  }

  if (settings.commentOnOrganic) {
    config['comment-on-organic'] = true
  }

  if (settings.autoClose) {
    config['auto-close'] = true

    const classifications = getAutoCloseClassifications(settings, 'app')
    if (classifications) {
      config['auto-close-classifications'] = classifications
    }
  }

  if (settings.honeypot) {
    config.honeypot = true
  }

  if (settings.mode !== 'full') {
    config.mode = settings.mode
  }

  const labels = getCustomLabels(settings, 'app')
  if (labels.length > 0) {
    config.labels = Object.fromEntries(
      labels.map(({ key, value }) => [key, value]),
    )
  }

  const messages: Record<string, string> = Object.fromEntries(
    getCustomMessages(settings, 'app').map(({ key, value }) => [key, value]),
  )
  if (settings.honeypot && settings.messageHoneypot) {
    messages.honeypot = settings.messageHoneypot
  }
  if (settings.honeypot && settings.messageHoneypotFirstTime) {
    messages['honeypot-first-time'] = settings.messageHoneypotFirstTime
  }
  if (Object.keys(messages).length > 0) {
    config.messages = messages
  }

  return stringify(config, { lineWidth: 0 })
}

/** The action's `with:` inputs, in the order action.yml declares them. */
function getActionInputs(settings: ConfigSettings) {
  const inputs: Record<string, string | boolean> = {}

  // Action inputs are strings: lists go in comma-separated.
  if (settings.allowedUsers.length > 0) {
    inputs['allowed-users'] = settings.allowedUsers.join(',')
  }
  if (settings.trustedAuthorAssociations.length > 0) {
    inputs['trusted-author-associations'] =
      settings.trustedAuthorAssociations.join(',')
  }
  if (!settings.scanPullRequests) {
    inputs['scan-pull-requests'] = false
  }
  if (settings.scanIssues) {
    inputs['scan-issues'] = true
  }
  if (settings.mode !== 'full') {
    inputs.mode = settings.mode
  }
  if (settings.commentOnOrganic) {
    inputs['comment-on-organic'] = true
  }
  if (settings.cache) {
    inputs['cache-path'] = ACTION_CACHE_PATH
  }

  for (const { key, value } of getCustomLabels(settings, 'action')) {
    inputs[`label-${key}`] = value
  }

  if (settings.autoClose) {
    inputs['auto-close'] = true

    const classifications = getAutoCloseClassifications(settings, 'action')
    if (classifications) {
      inputs['auto-close-classifications'] = classifications.join(',')
    }
  }

  for (const { key, value } of getCustomMessages(settings, 'action')) {
    inputs[`message-${key}`] = value
  }

  if (settings.honeypot) {
    inputs.honeypot = true

    if (settings.messageHoneypot) {
      inputs['message-honeypot'] = settings.messageHoneypot
    }
    if (settings.messageHoneypotFirstTime) {
      inputs['message-honeypot-first-time'] = settings.messageHoneypotFirstTime
    }
  }

  return inputs
}

/**
 * The workflow from the action's README, with each step pinned to its latest
 * release SHA and the tag alongside for Dependabot and Renovate.
 */
export function buildActionWorkflow(
  settings: ConfigSettings,
  releases: ActionReleasesResponse,
): string {
  const on: Record<string, { types: string[] }> = {
    pull_request_target: { types: ['opened', 'reopened'] },
    issues: { types: ['opened'] },
  }

  // The honeypot has to see the author's reply to the bait.
  if (settings.honeypot) {
    on.issue_comment = { types: ['created'] }
  }

  const steps: Record<string, unknown>[] = []
  // The release each step is pinned to, by step index.
  const pinnedTags: string[] = []

  if (settings.cache) {
    steps.push({
      name: 'Cache AgentScan analysis',
      uses: `actions/cache@${releases.cache.sha}`,
      with: {
        path: ACTION_CACHE_PATH,
        key: 'agentscan-cache-${{ github.actor }}',
        'restore-keys': 'agentscan-cache-',
      },
    })
    pinnedTags.push(releases.cache.tag)
  }

  const inputs = getActionInputs(settings)
  steps.push({
    name: 'AgentScan',
    uses: `MatteoGabriele/agentscan-action@${releases.agentscan.sha}`,
    ...(Object.keys(inputs).length > 0 ? { with: inputs } : {}),
  })
  pinnedTags.push(releases.agentscan.tag)

  const doc = new Document({
    name: 'AgentScan',
    on,
    jobs: {
      agentscan: {
        'runs-on': 'ubuntu-latest',
        permissions: {
          'pull-requests': 'write',
          issues: 'write',
          contents: 'read',
        },
        steps,
      },
    },
  })

  pinnedTags.forEach((tag, index) => {
    const uses = doc.getIn(['jobs', 'agentscan', 'steps', index, 'uses'], true)
    if (isScalar(uses)) {
      uses.comment = ` ${tag}`
    }
  })

  // A blank line between the top-level blocks, as in the README.
  if (isMap(doc.contents)) {
    for (const pair of doc.contents.items) {
      if (isScalar(pair.key) && pair.key.value !== 'name') {
        pair.key.spaceBefore = true
      }
    }
  }

  return doc.toString({ lineWidth: 0 })
}
