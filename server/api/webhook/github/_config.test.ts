import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CONFIG,
  MAX_MESSAGE_LENGTH,
  parseRepoConfig,
  SUPPORTED_CONFIG_VERSION,
} from './_config'

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('DEFAULT_CONFIG', () => {
  it('is the documented shape', () => {
    expect(DEFAULT_CONFIG).toEqual({
      version: SUPPORTED_CONFIG_VERSION,
      'allowed-users': [],
      'trusted-author-associations': [],
      'auto-close': false,
      'auto-close-classifications': ['automation'],
      honeypot: false,
      mode: 'full',
      'comment-on-organic': false,
      scan: { 'pull-requests': true, issues: false },
      labels: {
        'community-flagged': 'agentscan:community-flagged',
        mixed: 'agentscan:mixed-signals',
        automation: 'agentscan:automation-signals',
      },
      messages: {
        organic: '',
        mixed: '',
        automation: '',
        'insufficient-data': '',
        'community-flagged': '',
        honeypot: '',
        'honeypot-first-time': '',
      },
    })
  })
})

describe('parseRepoConfig', () => {
  it('reads a valid file', () => {
    const config = parseRepoConfig(`
mode: comment
honeypot: true
auto-close: true
allowed-users:
  - dependabot
scan:
  issues: true
`)

    expect(config.mode).toBe('comment')
    expect(config.honeypot).toBe(true)
    expect(config['auto-close']).toBe(true)
    expect(config['allowed-users']).toEqual(['dependabot'])
    // Untouched keys of a partially written section keep their defaults.
    expect(config.scan).toEqual({ 'pull-requests': true, issues: true })
  })

  it.each([
    ['empty', ''],
    ['comments only', '# nothing here'],
    ['a bare scalar', 'just a string'],
    ['a list', '- one\n- two'],
    ['malformed YAML', 'mode: [unclosed'],
  ])('falls back to defaults for %s', (_label, input) => {
    expect(parseRepoConfig(input)).toEqual(DEFAULT_CONFIG)
  })

  it('ignores a file written for a newer version', () => {
    const config = parseRepoConfig(
      `version: ${SUPPORTED_CONFIG_VERSION + 1}\nmode: silent`,
    )

    expect(config).toEqual(DEFAULT_CONFIG)
    expect(config.mode).toBe('full')
  })

  describe('rejects values that used to be passed through unread', () => {
    // `mode: FULL` matched none of the mode branches, so the app silently
    // stopped commenting and labelling instead of using the default.
    it.each(['FULL', 'silnet', 'Comment', 42, null, ['full']])(
      'falls back to the default mode for %o',
      (mode) => {
        expect(parseRepoConfig(`mode: ${JSON.stringify(mode)}`).mode).toBe(
          'full',
        )
      },
    )

    // A string has `.includes`, so `allowed-users: evil` exempted every author
    // whose login was a substring of it.
    it('does not accept a string as the allow list', () => {
      const config = parseRepoConfig('allowed-users: evilmaintainer')

      expect(config['allowed-users']).toEqual([])
      expect(config['allowed-users'].includes('evil')).toBe(false)
    })

    // A number has no `.includes` at all, which threw and failed the check run.
    it('does not accept a number as the allow list', () => {
      expect(parseRepoConfig('allowed-users: 5')['allowed-users']).toEqual([])
    })

    it('drops non-string entries from the allow list', () => {
      expect(
        parseRepoConfig('allowed-users:\n  - ok\n  - 5')['allowed-users'],
      ).toEqual([])
    })

    it('rejects an unknown author association', () => {
      expect(
        parseRepoConfig(
          'trusted-author-associations:\n  - owner\n  - EVERYONE',
        )['trusted-author-associations'],
      ).toEqual([])
    })

    it('rejects an unknown auto-close classification', () => {
      expect(
        parseRepoConfig('auto-close-classifications:\n  - everything')[
          'auto-close-classifications'
        ],
      ).toEqual(['automation'])
    })

    it.each(['auto-close', 'honeypot', 'comment-on-organic'])(
      'rejects a non-boolean %s',
      (key) => {
        expect(parseRepoConfig(`${key}: yes please`)).toMatchObject({
          [key]: false,
        })
      },
    )

    it('rejects a scalar where a section belongs', () => {
      expect(parseRepoConfig('scan: everything').scan).toEqual(
        DEFAULT_CONFIG.scan,
      )
    })
  })

  describe('custom messages', () => {
    it('keeps a message within the cap', () => {
      expect(
        parseRepoConfig('messages:\n  automation: Please explain').messages
          .automation,
      ).toBe('Please explain')
    })

    // The comment goes out under this app's name, so an unbounded message is
    // not passed through.
    it('drops a message over the cap', () => {
      const config = parseRepoConfig(
        `messages:\n  automation: "${'x'.repeat(MAX_MESSAGE_LENGTH + 1)}"`,
      )

      expect(config.messages.automation).toBe('')
    })

    it('drops only the offending message', () => {
      const config = parseRepoConfig(
        `messages:\n  automation: 12345\n  organic: kept`,
      )

      expect(config.messages.automation).toBe('')
      expect(config.messages.organic).toBe('kept')
    })
  })

  describe('labels', () => {
    it('accepts a custom label', () => {
      expect(
        parseRepoConfig('labels:\n  mixed: needs-review').labels.mixed,
      ).toBe('needs-review')
    })

    it.each([
      ['empty', '""'],
      ['over 50 characters', `"${'x'.repeat(51)}"`],
      ['not a string', '42'],
    ])('falls back for a label that is %s', (_label, value) => {
      expect(parseRepoConfig(`labels:\n  mixed: ${value}`).labels.mixed).toBe(
        DEFAULT_CONFIG.labels.mixed,
      )
    })
  })

  it('does not let a config pollute Object.prototype', () => {
    parseRepoConfig('__proto__:\n  polluted: true')

    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
