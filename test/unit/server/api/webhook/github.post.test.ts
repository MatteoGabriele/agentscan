import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { IdentifyResult } from '@unveil/identity'
import { getClassificationDetails, identify } from '@unveil/identity'
import { parse as parseYaml } from 'yaml'
import handler from '../../../../../server/api/webhook/github/index.post.ts'

// vi.hoisted runs before all module imports — used to stub Nuxt auto-imports
// and to create shared mock objects referenced in vi.mock() factories below.
const {
  mockWebhooks,
  mockInstallationOctokit,
  mockAppOctokit,
  mockApp,
  readRawBodyMock,
  useRuntimeConfigMock,
  getHeaderMock,
} = vi.hoisted(() => {
  const mockWebhooks = { verify: vi.fn() }

  const mockInstallationOctokit = {
    rest: {
      repos: { getContent: vi.fn() },
      users: { getByUsername: vi.fn() },
      activity: { listPublicEventsForUser: vi.fn() },
      issues: {
        listComments: vi.fn(),
        createComment: vi.fn(),
        updateComment: vi.fn(),
        addLabels: vi.fn(),
        createLabel: vi.fn(),
        update: vi.fn(),
      },
    },
  }

  const mockAppOctokit = {
    rest: { repos: { getContent: vi.fn() } },
  }

  const mockApp = {
    getInstallationOctokit: vi.fn(),
    octokit: mockAppOctokit,
  }

  const readRawBodyMock = vi.fn()
  const useRuntimeConfigMock = vi.fn()
  const getHeaderMock = vi.fn()

  vi.stubGlobal('defineEventHandler', (fn: () => void) => fn)
  vi.stubGlobal('readRawBody', readRawBodyMock)
  vi.stubGlobal('useRuntimeConfig', useRuntimeConfigMock)
  vi.stubGlobal('getHeader', getHeaderMock)
  vi.stubGlobal(
    'createError',
    ({ statusCode, message }: { statusCode: number; message: string }) => {
      const err = new Error(message) as Error & { statusCode: number }
      err.statusCode = statusCode
      return err
    },
  )

  return {
    mockWebhooks,
    mockInstallationOctokit,
    mockAppOctokit,
    mockApp,
    readRawBodyMock,
    useRuntimeConfigMock,
    getHeaderMock,
  }
})

vi.mock('octokit', () => ({
  App: vi.fn().mockImplementation(function () {
    return mockApp
  }),
  Octokit: {
    plugin: vi.fn().mockReturnValue(vi.fn()),
  },
}))
vi.mock('@octokit/webhooks', () => ({
  Webhooks: vi.fn().mockImplementation(function () {
    return mockWebhooks
  }),
}))
vi.mock('@unveil/identity')
vi.mock('yaml', () => ({ parse: vi.fn() }))

// --- Shared fixtures ---

const RUNTIME_CONFIG = {
  githubWebhookSecret: 'test-secret',
  githubAppId: 'test-app-id',
  githubAppPrivateKey: Buffer.from('test-private-key').toString('base64'),
}

const BASE_PAYLOAD = {
  action: 'opened',
  pull_request: { number: 123, user: { login: 'test-user' } },
  installation: { id: 42 },
  repository: { owner: { login: 'test-owner' }, name: 'test-repo' },
}

const MOCK_ANALYSIS: IdentifyResult = {
  classification: 'organic',
  score: 20,
  flags: [
    {
      label: 'Test Flag',
      points: 10,
      detail: 'Test detail',
      data: [],
      events: [],
    },
  ],
  isBountyHunter: false,
  profile: { age: 365, repos: 0 },
}

// The event object itself is irrelevant — handler accesses it only via mocked globals.
const MOCK_EVENT = {}

// --- Helpers ---

function setupEvent(
  payloadOverrides: Record<string, unknown> = {},
  configOverrides: Record<string, unknown> = {},
) {
  const payload = { ...BASE_PAYLOAD, ...payloadOverrides }
  readRawBodyMock.mockResolvedValue(JSON.stringify(payload))
  getHeaderMock.mockReturnValue('sha256=valid-signature')
  useRuntimeConfigMock.mockReturnValue({ ...RUNTIME_CONFIG, ...configOverrides })
}

function mockRepoConfig(config: Record<string, unknown>) {
  mockInstallationOctokit.rest.repos.getContent.mockResolvedValueOnce({
    data: { content: Buffer.from('dummy yaml content').toString('base64') },
  })
  vi.mocked(parseYaml).mockReturnValueOnce(config)
}

function mockVerifiedList(usernames: string[]) {
  const entries = usernames.map((username) => ({
    username,
    reason: 'Verified automation',
    createdAt: '2024-01-01',
    issueUrl: 'https://example.com',
  }))
  mockAppOctokit.rest.repos.getContent.mockResolvedValueOnce({
    data: { content: Buffer.from(JSON.stringify(entries)).toString('base64') },
  })
}

// --- Tests ---

describe('GitHub Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: valid signature, full PR payload, no agentscan.yml, no verified list
    mockWebhooks.verify.mockResolvedValue(true)
    mockApp.getInstallationOctokit.mockResolvedValue(mockInstallationOctokit)
    mockInstallationOctokit.rest.repos.getContent.mockRejectedValue(new Error('Not Found'))
    mockInstallationOctokit.rest.users.getByUsername.mockResolvedValue({
      data: { public_repos: 10, created_at: '2020-01-01T00:00:00Z' },
    })
    mockInstallationOctokit.rest.activity.listPublicEventsForUser.mockResolvedValue({ data: [] })
    mockInstallationOctokit.rest.issues.listComments.mockResolvedValue({ data: [] })
    mockInstallationOctokit.rest.issues.createComment.mockResolvedValue({})
    mockInstallationOctokit.rest.issues.updateComment.mockResolvedValue({})
    mockInstallationOctokit.rest.issues.addLabels.mockResolvedValue({})
    mockInstallationOctokit.rest.issues.createLabel.mockResolvedValue({})
    mockInstallationOctokit.rest.issues.update.mockResolvedValue({})
    mockAppOctokit.rest.repos.getContent.mockRejectedValue(new Error('Not Found'))

    vi.mocked(identify).mockReturnValue(MOCK_ANALYSIS)
    vi.mocked(getClassificationDetails).mockReturnValue({
      label: 'Organic Account',
      description: 'This account appears to be organic.',
    })

    setupEvent()
  })

  describe('Signature Verification', () => {
    it('returns 400 when the body is empty', async () => {
      readRawBodyMock.mockResolvedValue(null)

      await expect(handler(MOCK_EVENT)).rejects.toMatchObject({ statusCode: 400 })
    })

    it('returns 503 when the webhook secret is not configured', async () => {
      useRuntimeConfigMock.mockReturnValue({ ...RUNTIME_CONFIG, githubWebhookSecret: '' })

      await expect(handler(MOCK_EVENT)).rejects.toMatchObject({ statusCode: 503 })
    })

    it('returns 401 when the x-hub-signature-256 header is missing', async () => {
      getHeaderMock.mockReturnValue(null)

      await expect(handler(MOCK_EVENT)).rejects.toMatchObject({ statusCode: 401 })
    })

    it('returns 401 when the signature is invalid', async () => {
      mockWebhooks.verify.mockResolvedValue(false)

      await expect(handler(MOCK_EVENT)).rejects.toMatchObject({ statusCode: 401 })
    })
  })

  describe('Early Returns', () => {
    it('returns { ok: true } for non-opened/reopened actions', async () => {
      setupEvent({ action: 'closed' })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true })
      expect(identify).not.toHaveBeenCalled()
    })

    it('returns { ok: true } when pull_request is absent from payload', async () => {
      setupEvent({ pull_request: undefined })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true })
      expect(identify).not.toHaveBeenCalled()
    })

    it('returns { ok: true } when installation is absent from payload', async () => {
      setupEvent({ installation: undefined })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true })
      expect(identify).not.toHaveBeenCalled()
    })

    it('returns 503 when GitHub App credentials are not configured', async () => {
      useRuntimeConfigMock.mockReturnValue({
        ...RUNTIME_CONFIG,
        githubAppId: '',
        githubAppPrivateKey: '',
      })

      await expect(handler(MOCK_EVENT)).rejects.toMatchObject({ statusCode: 503 })
    })

    it('returns { ok: true } for reopened PRs', async () => {
      setupEvent({ action: 'reopened' })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true, flagged: false, classification: 'organic' })
    })
  })

  describe('Normal Flow', () => {
    it('fetches 3 pages of public events', async () => {
      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.activity.listPublicEventsForUser).toHaveBeenCalledTimes(3)
      expect(mockInstallationOctokit.rest.activity.listPublicEventsForUser).toHaveBeenNthCalledWith(
        1,
        {
          username: 'test-user',
          per_page: 100,
          page: 1,
        },
      )
      expect(mockInstallationOctokit.rest.activity.listPublicEventsForUser).toHaveBeenNthCalledWith(
        3,
        {
          username: 'test-user',
          per_page: 100,
          page: 3,
        },
      )
    })

    it('calls identify with user data from the GitHub API', async () => {
      mockInstallationOctokit.rest.users.getByUsername.mockResolvedValue({
        data: { public_repos: 25, created_at: '2019-06-15T00:00:00Z' },
      })

      await handler(MOCK_EVENT)

      expect(identify).toHaveBeenCalledWith(
        expect.objectContaining({
          accountName: 'test-user',
          reposCount: 25,
          createdAt: '2019-06-15T00:00:00Z',
        }),
      )
    })

    it('returns classification and flagged status', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })

      const result = await handler(MOCK_EVENT)

      expect(result).toMatchObject({ ok: true, flagged: true, classification: 'automation' })
    })

    it('returns flagged: false for organic accounts', async () => {
      const result = await handler(MOCK_EVENT)

      expect(result).toMatchObject({ ok: true, flagged: false, classification: 'organic' })
    })
  })

  describe('Known Bots', () => {
    it('returns { ok: true } without scanning when username is a known CI/CD bot', async () => {
      setupEvent({ pull_request: { number: 123, user: { login: 'dependabot[bot]' } } })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true })
      expect(identify).not.toHaveBeenCalled()
    })

    it('returns { ok: true } without scanning for usernames ending with [bot]', async () => {
      setupEvent({ pull_request: { number: 123, user: { login: 'some-custom-tool[bot]' } } })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true })
      expect(identify).not.toHaveBeenCalled()
    })

    it('proceeds with scan for regular user accounts', async () => {
      await handler(MOCK_EVENT)

      expect(identify).toHaveBeenCalled()
    })
  })

  describe('Allowed Users (via repo config)', () => {
    it('returns { ok: true } without scanning when username is in allowedUsers', async () => {
      mockRepoConfig({ 'allowed-users': ['test-user', 'other-user'] })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true })
      expect(identify).not.toHaveBeenCalled()
    })

    it('proceeds with scan when username is not in allowedUsers', async () => {
      mockRepoConfig({ 'allowed-users': ['other-user'] })

      await handler(MOCK_EVENT)

      expect(identify).toHaveBeenCalled()
    })
  })

  describe('Scan Mode: silent', () => {
    it('returns { ok: true } without posting a comment or adding labels', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })
      mockRepoConfig({ mode: 'silent' })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true })
      expect(mockInstallationOctokit.rest.issues.createComment).not.toHaveBeenCalled()
      expect(mockInstallationOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
    })
  })

  describe('Scan Mode: labels', () => {
    it('adds labels but does not post a comment', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })
      mockRepoConfig({ mode: 'labels' })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.addLabels).toHaveBeenCalled()
      expect(mockInstallationOctokit.rest.issues.createComment).not.toHaveBeenCalled()
    })

    it('does not add labels for organic accounts in labels mode', async () => {
      mockRepoConfig({ mode: 'labels' })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
    })
  })

  describe('Scan Mode: comment', () => {
    it('posts a comment but does not add labels', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })
      mockRepoConfig({ mode: 'comment' })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.createComment).toHaveBeenCalled()
      expect(mockInstallationOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
    })

    it('updates an existing agentscan comment instead of creating a new one', async () => {
      mockRepoConfig({ mode: 'comment' })
      mockInstallationOctokit.rest.issues.listComments.mockResolvedValue({
        data: [{ id: 999, body: '<!-- agentscanapp-bot -->\n### ✅ Organic Account' }],
      })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.updateComment).toHaveBeenCalledWith(
        expect.objectContaining({ comment_id: 999 }),
      )
      expect(mockInstallationOctokit.rest.issues.createComment).not.toHaveBeenCalled()
    })
  })

  describe('Scan Mode: full (default)', () => {
    it('posts a comment and adds labels when classification is not organic', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })
      vi.mocked(getClassificationDetails).mockReturnValue({
        label: 'Automated Account',
        description: 'This account appears to be automated.',
      })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
        }),
      )
      expect(mockInstallationOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          issue_number: 123,
          labels: ['agentscan:automation-signals'],
        }),
      )
    })

    it('posts a comment but no labels for organic accounts', async () => {
      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.createComment).toHaveBeenCalled()
      expect(mockInstallationOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
    })
  })

  describe('Label Assignment', () => {
    it('does not add labels for organic classification', async () => {
      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.addLabels).not.toHaveBeenCalled()
    })

    it('adds mixed-signals label for mixed classification', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'mixed' })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['agentscan:mixed-signals'] }),
      )
    })

    it('adds automation-signals label for automation classification', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['agentscan:automation-signals'] }),
      )
    })

    it('adds community-flagged label for accounts in the verified list', async () => {
      mockVerifiedList(['test-user'])

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['agentscan:community-flagged'] }),
      )
    })

    it('uses custom labels from repo config', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })
      mockRepoConfig({
        labels: {
          automation: 'blocked:bot-account',
          mixed: 'review:mixed-signals',
          ['community-flagged']: 'security:flagged',
        },
      })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.addLabels).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['blocked:bot-account'] }),
      )
    })
  })

  describe('silentOnOrganic', () => {
    it('returns { ok: true } without comment or labels for organic accounts when enabled', async () => {
      mockRepoConfig({ 'silent-on-organic': true })

      const result = await handler(MOCK_EVENT)

      expect(result).toEqual({ ok: true })
      expect(mockInstallationOctokit.rest.issues.createComment).not.toHaveBeenCalled()
    })

    it('still posts comment for community-flagged accounts even when silentOnOrganic is true', async () => {
      mockRepoConfig({ 'silent-on-organic': true })
      mockVerifiedList(['test-user'])

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.createComment).toHaveBeenCalled()
    })

    it('still posts comment for non-organic accounts when silentOnOrganic is true', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })
      mockRepoConfig({ 'silent-on-organic': true })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.createComment).toHaveBeenCalled()
    })
  })

  describe('Auto-Close', () => {
    it('does not close the PR when autoClose is disabled (default)', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.update).not.toHaveBeenCalled()
    })

    it('closes the PR when autoClose is enabled and classification matches', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })
      mockRepoConfig({ 'auto-close': true, 'auto-close-classifications': ['automation'] })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        state: 'closed',
        state_reason: 'not_planned',
      })
    })

    it('does not close the PR when classification is not in autoCloseClassifications', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'mixed' })
      mockRepoConfig({ 'auto-close': true, 'auto-close-classifications': ['automation'] })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.update).not.toHaveBeenCalled()
    })

    it('closes community-flagged PRs when autoClose is enabled', async () => {
      mockRepoConfig({ 'auto-close': true, 'auto-close-classifications': ['automation'] })
      mockVerifiedList(['test-user'])

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'closed', state_reason: 'not_planned' }),
      )
    })

    it('closes the PR when multiple classifications are in the autoClose list', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'mixed' })
      mockRepoConfig({ 'auto-close': true, 'auto-close-classifications': ['automation', 'mixed'] })

      await handler(MOCK_EVENT)

      expect(mockInstallationOctokit.rest.issues.update).toHaveBeenCalled()
    })
  })

  describe('Custom Messages (via repo config)', () => {
    it('uses the custom automation message in the posted comment', async () => {
      vi.mocked(identify).mockReturnValue({ ...MOCK_ANALYSIS, classification: 'automation' })
      mockRepoConfig({
        messages: { automation: 'This PR was opened by a bot. Please review carefully.' },
      })

      await handler(MOCK_EVENT)

      const commentCall = mockInstallationOctokit.rest.issues.createComment.mock.calls[0][0]
      expect(commentCall.body).toContain('This PR was opened by a bot. Please review carefully.')
    })

    it('uses the custom communityFlagged message for flagged accounts', async () => {
      mockVerifiedList(['test-user'])
      mockRepoConfig({ messages: { 'community-flagged': 'Flagged by our community watchlist.' } })

      await handler(MOCK_EVENT)

      const commentCall = mockInstallationOctokit.rest.issues.createComment.mock.calls[0][0]
      expect(commentCall.body).toContain('Flagged by our community watchlist.')
    })
  })
})
