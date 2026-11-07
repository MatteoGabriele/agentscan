import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import type { ActionReleasesResponse } from '../types/action-release'
import {
  buildActionWorkflow,
  buildAppConfig,
  DEFAULT_LABELS,
  type ConfigSettings,
  type Platform,
} from './agentscan-config'

const RELEASES: ActionReleasesResponse = {
  agentscan: {
    tag: 'v2.6.0',
    sha: '3e61e47813567b9a9a5b7944a14f3eb0798ffd1b',
    url: 'https://github.com/MatteoGabriele/agentscan-action/releases/tag/v2.6.0',
  },
  cache: {
    tag: 'v6.1.0',
    sha: '55cc8345863c7cc4c66a329aec7e433d2d1c52a9',
    url: 'https://github.com/actions/cache/releases/tag/v6.1.0',
  },
}

function settings(
  overrides: Partial<ConfigSettings> = {},
  platform: Platform = 'app',
): ConfigSettings {
  return {
    mode: 'full',
    scanPullRequests: true,
    scanIssues: false,
    allowedUsers: [],
    trustedAuthorAssociations: [],
    commentOnOrganic: false,
    autoClose: false,
    autoCloseClassifications: ['automation'],
    honeypot: false,
    cache: false,
    labels: { ...DEFAULT_LABELS[platform] },
    messages: {
      organic: '',
      mixed: '',
      automation: '',
      'community-flagged': '',
      'insufficient-data': '',
    },
    messageHoneypot: '',
    messageHoneypotFirstTime: '',
    ...overrides,
  }
}

function agentscanStep(workflow: string) {
  const steps: { name: string; with?: Record<string, unknown> }[] =
    parse(workflow).jobs.agentscan.steps
  return steps.find((step) => step.name === 'AgentScan')
}

describe('buildAppConfig', () => {
  it('only writes the version when nothing differs from the defaults', () => {
    expect(buildAppConfig(settings())).toBe('version: 1\n')
  })

  it('writes only the labels that differ from the app defaults', () => {
    const config = parse(
      buildAppConfig(
        settings({
          labels: { ...DEFAULT_LABELS.app, mixed: 'needs-review' },
        }),
      ),
    )

    expect(config.labels).toEqual({ mixed: 'needs-review' })
  })

  it('keeps organic in auto-close-classifications', () => {
    const config = parse(
      buildAppConfig(
        settings({
          autoClose: true,
          autoCloseClassifications: ['automation', 'organic'],
        }),
      ),
    )

    expect(config['auto-close-classifications']).toEqual([
      'automation',
      'organic',
    ])
  })

  it('leaves honeypot greetings out when the honeypot is off', () => {
    const config = parse(
      buildAppConfig(settings({ messageHoneypot: 'Hi {username}' })),
    )

    expect(config.messages).toBeUndefined()
  })
})

describe('buildActionWorkflow', () => {
  it('pins the action to the release commit with the tag as a comment', () => {
    const workflow = buildActionWorkflow(settings({}, 'action'), RELEASES)

    expect(workflow).toContain(
      'uses: MatteoGabriele/agentscan-action@3e61e47813567b9a9a5b7944a14f3eb0798ffd1b # v2.6.0',
    )
  })

  it('has no inputs when nothing differs from the action defaults', () => {
    const workflow = buildActionWorkflow(settings({}, 'action'), RELEASES)

    expect(agentscanStep(workflow)?.with).toBeUndefined()
  })

  it('runs on the triggers and permissions from the action README', () => {
    const workflow = parse(
      buildActionWorkflow(settings({}, 'action'), RELEASES),
    )

    expect(workflow.on).toEqual({
      pull_request_target: { types: ['opened', 'reopened'] },
      issues: { types: ['opened'] },
    })
    expect(workflow.jobs.agentscan.permissions).toEqual({
      'pull-requests': 'write',
      issues: 'write',
      contents: 'read',
    })
  })

  it('also runs on issue comments when the honeypot is on', () => {
    const workflow = parse(
      buildActionWorkflow(settings({ honeypot: true }, 'action'), RELEASES),
    )

    expect(workflow.on.issue_comment).toEqual({ types: ['created'] })
  })

  it('passes lists as comma-separated strings', () => {
    const workflow = buildActionWorkflow(
      settings(
        {
          allowedUsers: ['alice', 'bob'],
          trustedAuthorAssociations: ['owner', 'member'],
        },
        'action',
      ),
      RELEASES,
    )

    expect(agentscanStep(workflow)?.with).toMatchObject({
      'allowed-users': 'alice,bob',
      'trusted-author-associations': 'owner,member',
    })
  })

  it('drops organic from auto-close-classifications, which the action ignores', () => {
    const workflow = buildActionWorkflow(
      settings(
        {
          autoClose: true,
          autoCloseClassifications: ['automation', 'organic'],
        },
        'action',
      ),
      RELEASES,
    )

    expect(agentscanStep(workflow)?.with).toEqual({ 'auto-close': true })
  })

  it('compares labels against the action defaults', () => {
    const workflow = buildActionWorkflow(
      settings({ labels: { ...DEFAULT_LABELS.app } }, 'action'),
      RELEASES,
    )

    expect(agentscanStep(workflow)?.with).toEqual({
      'label-automation': 'agentscan:automation-signals',
    })
  })

  it('leaves out the insufficient-data message, which the action has no input for', () => {
    const workflow = buildActionWorkflow(
      settings(
        {
          messages: {
            organic: '',
            mixed: '',
            automation: 'Closed.',
            'community-flagged': '',
            'insufficient-data': 'Come back later.',
          },
        },
        'action',
      ),
      RELEASES,
    )

    expect(agentscanStep(workflow)?.with).toEqual({
      'message-automation': 'Closed.',
    })
  })

  it('adds a pinned cache step and passes its path to the action', () => {
    const workflow = buildActionWorkflow(
      settings({ cache: true }, 'action'),
      RELEASES,
    )

    expect(workflow).toContain(
      'uses: actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9 # v6.1.0',
    )
    expect(parse(workflow).jobs.agentscan.steps[0].with).toEqual({
      path: '.agentscan-cache',
      key: 'agentscan-cache-${{ github.actor }}',
      'restore-keys': 'agentscan-cache-',
    })
    expect(agentscanStep(workflow)?.with).toEqual({
      'cache-path': '.agentscan-cache',
    })
  })
})
