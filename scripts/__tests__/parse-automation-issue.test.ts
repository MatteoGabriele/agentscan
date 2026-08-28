import { describe, it, expect, vi, beforeAll } from 'vitest'
import {
  parseIssueBody,
  sanitizeReason,
  MAX_REASON_LENGTH,
  parseApprovedBy,
  validateEntry,
  generateEntry,
  type AutomationEntry,
} from '../parse-automation-issue'

// Mock console.error to suppress output during tests
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('parseIssueBody', () => {
  const sampleIssueBody = `### GitHub Username

nanookclaw

### GitHub User ID

258741235

### Why do you believe this is an automated account?

This user left a lengthy, unsolicited comment on a PR, treating it as a response to feedback. Since the user is not a contributor to the repo, responding to feedback makes no sense. Additionally, the user's name is suffixed with "claw".

### Supporting Evidence

- https://github.com/biomejs/biome/pull/4891#issuecomment-4323263151
- agentscan's metrics flag it
- https://github.com/nanookclaw/nanookclaw it has its own agent repo public, using the same name
- https://github.com/nanookclaw/nanook-website has the description "Nanook ❄️ — Personal website for an autonomous AI agent"

### Additional Context

https://github.com/biomejs/biome/pull/4891#issuecomment-4323263151

### Acknowledgment

- [x] I believe this report is accurate and in good faith
- [x] I understand this may be reviewed by maintainers before approval`

  it('should parse GitHub username correctly', () => {
    const parsed = parseIssueBody(sampleIssueBody)
    expect(parsed.username).toBe('nanookclaw')
  })

  it('should parse GitHub User ID as number', () => {
    const parsed = parseIssueBody(sampleIssueBody)
    expect(parsed.id).toBe(258741235)
    expect(typeof parsed.id).toBe('number')
  })

  it('should parse and clean reason field', () => {
    const parsed = parseIssueBody(sampleIssueBody)
    expect(parsed.reason).toContain('unsolicited comment')
    expect(parsed.reason).toContain('claw')
    // Should be a single line (no double newlines)
    expect(parsed.reason).not.toContain('\n\n')
  })

  it('should handle minimal form input', () => {
    const minimalBody = `### GitHub Username

testuser

### GitHub User ID

123456

### Why do you believe this is an automated account?

Suspicious behavior`

    const parsed = parseIssueBody(minimalBody)
    expect(parsed.username).toBe('testuser')
    expect(parsed.id).toBe(123456)
    expect(parsed.reason).toBe('Suspicious behavior')
  })

  it('should handle missing fields gracefully', () => {
    const incompleteBody = `### GitHub Username

testuser`

    const parsed = parseIssueBody(incompleteBody)
    expect(parsed.username).toBe('testuser')
    expect(parsed.id).toBeUndefined()
    expect(parsed.reason).toBeUndefined()
  })
})

describe('sanitizeReason', () => {
  it('strips bare URLs and the words left dangling in front of them', () => {
    expect(
      sanitizeReason(
        'Self-disclosed as an AI agent, see https://github.com/foo/bar/pull/1',
      ),
    ).toBe('Self-disclosed as an AI agent')
  })

  it('strips a parenthetical built around a link', () => {
    expect(
      sanitizeReason(
        'Self-disclosed AI agent (see github.com/foo/bar/pull/12)',
      ),
    ).toBe('Self-disclosed AI agent')
  })

  it('leaves a link-free parenthetical alone', () => {
    expect(
      sanitizeReason('Bursty activity only (no human-looking commits)'),
    ).toBe('Bursty activity only (no human-looking commits)')
  })

  it('keeps the text of a markdown link and drops the URL', () => {
    expect(
      sanitizeReason('Describes itself as [an AI agent](https://example.com)'),
    ).toBe('Describes itself as an AI agent')
  })

  it('strips autolinks, images and HTML tags', () => {
    expect(
      sanitizeReason(
        'Bot account <https://x.com/bot> ![proof](https://img.co/a.png) <b>confirmed</b>',
      ),
    ).toBe('Bot account confirmed')
  })

  it('strips bullets, blockquotes and code ticks', () => {
    expect(sanitizeReason('- `bot` account > flagged')).toBe(
      'bot account > flagged',
    )
  })

  it('leaves underscores inside names alone', () => {
    expect(sanitizeReason('Same pattern as some_bot_name')).toBe(
      'Same pattern as some_bot_name',
    )
  })

  it('keeps only the first paragraph', () => {
    expect(sanitizeReason('First sentence.\n\nSecond paragraph.')).toBe(
      'First sentence.',
    )
  })

  it('truncates at a word boundary past the maximum length', () => {
    const reason = sanitizeReason('word '.repeat(100))!
    expect(reason.length).toBeLessThanOrEqual(MAX_REASON_LENGTH + 1)
    expect(reason.endsWith('word…')).toBe(true)
  })

  it('passes an already clean sentence through untouched', () => {
    expect(sanitizeReason('Heavy automation usage creating spam PRs')).toBe(
      'Heavy automation usage creating spam PRs',
    )
  })
})

describe('validateEntry', () => {
  it('should validate a complete entry', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      id: 123456,
      reason: 'Suspicious behavior',
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
    }
    expect(validateEntry(entry)).toBe(true)
  })

  it('should reject a reason containing a link', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      id: 123456,
      reason: 'Spam PRs, see https://github.com/foo/bar/pull/1',
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
    }
    expect(validateEntry(entry)).toBe(false)
  })

  it('should reject a reason longer than the maximum length', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      id: 123456,
      reason: 'a'.repeat(MAX_REASON_LENGTH + 2),
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
    }
    expect(validateEntry(entry)).toBe(false)
  })

  it('should reject entry missing username', () => {
    const entry: Partial<AutomationEntry> = {
      id: 123456,
      reason: 'Suspicious',
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
    }
    expect(validateEntry(entry)).toBe(false)
  })

  it('should reject entry missing id', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      reason: 'Suspicious',
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
    }
    expect(validateEntry(entry)).toBe(false)
  })

  it('should reject entry missing reason', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      id: 123456,
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
    }
    expect(validateEntry(entry)).toBe(false)
  })

  it('should reject entry missing issueUrl', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      id: 123456,
      reason: 'Suspicious',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
    }
    expect(validateEntry(entry)).toBe(false)
  })

  it('should accept an entry with an approvedBy list', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      id: 123456,
      reason: 'Suspicious behavior',
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
      approvedBy: ['alice', 'bob'],
    }
    expect(validateEntry(entry)).toBe(true)
  })

  it('should reject an empty approvedBy list rather than write it', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      id: 123456,
      reason: 'Suspicious behavior',
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
      approvedBy: [],
    }
    expect(validateEntry(entry)).toBe(false)
  })

  it('should reject a malformed approvedBy list', () => {
    const entry = {
      username: 'testuser',
      id: 123456,
      reason: 'Suspicious behavior',
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
      reportedBy: 'reporter',
      approvedBy: ['alice', ''],
    } as Partial<AutomationEntry>
    expect(validateEntry(entry)).toBe(false)
  })

  it('should reject entry missing reportedBy', () => {
    const entry: Partial<AutomationEntry> = {
      username: 'testuser',
      id: 123456,
      reason: 'Suspicious',
      issueUrl: 'https://github.com/test/issue/1',
      createdAt: '2024-01-01',
    }
    expect(validateEntry(entry)).toBe(false)
  })
})

describe('generateEntry', () => {
  const parsedData: Partial<AutomationEntry> = {
    username: 'testuser',
    id: 123456,
    reason: 'Test reason',
  }

  it('should generate a complete entry', () => {
    const entry = generateEntry(
      parsedData,
      'https://github.com/test/issue/1',
      'reporter',
    )
    expect(entry.username).toBe('testuser')
    expect(entry.id).toBe(123456)
    expect(entry.reason).toBe('Test reason')
    expect(entry.issueUrl).toBe('https://github.com/test/issue/1')
    expect(entry.reportedBy).toBe('reporter')
    expect(entry.createdAt).toBeDefined()
  })

  it('should use provided createdAt date', () => {
    const entry = generateEntry(
      parsedData,
      'https://github.com/test/issue/1',
      'reporter',
      '2024-01-15',
    )
    expect(entry.createdAt).toBe('2024-01-15')
  })

  it('should generate ISO date when createdAt is not provided', () => {
    const entry = generateEntry(
      parsedData,
      'https://github.com/test/issue/1',
      'reporter',
    )
    // Check it's in YYYY-MM-DD format
    expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('should handle empty issueUrl', () => {
    const entry = generateEntry(parsedData, '', 'reporter')
    expect(entry.issueUrl).toBe('')
  })
})

describe('Integration: Full parsing workflow', () => {
  const sampleIssueBody = `### GitHub Username

nanookclaw

### GitHub User ID

258741235

### Why do you believe this is an automated account?

This is suspicious behavior.

### Supporting Evidence

- Some evidence here`

  it('should parse, validate, and generate entry successfully', () => {
    const parsed = parseIssueBody(sampleIssueBody)
    const entry = generateEntry(
      parsed,
      'https://github.com/biomejs/biome/pull/4891#issuecomment-4323263151',
      'reporter',
      '2024-04-28',
    )

    expect(validateEntry(entry)).toBe(true)
    expect(entry.username).toBe('nanookclaw')
    expect(entry.id).toBe(258741235)
    expect(entry.reason).toBe('This is suspicious behavior.')
    expect(entry.issueUrl).toBe(
      'https://github.com/biomejs/biome/pull/4891#issuecomment-4323263151',
    )
    expect(entry.reportedBy).toBe('reporter')
    expect(entry.createdAt).toBe('2024-04-28')
  })
})

describe('parseApprovedBy', () => {
  it('splits on commas and whitespace', () => {
    expect(parseApprovedBy('alice, bob\ncarol')).toEqual([
      'alice',
      'bob',
      'carol',
    ])
  })

  it('strips a leading @ and drops duplicates and empties', () => {
    expect(parseApprovedBy('@alice,alice, ,bob')).toEqual(['alice', 'bob'])
  })

  // These logins end up on the public list, so they keep the casing GitHub gave.
  it('leaves casing alone', () => {
    expect(parseApprovedBy('MatteoGabriele')).toEqual(['MatteoGabriele'])
  })

  it('handles an undefined value', () => {
    expect(parseApprovedBy(undefined)).toEqual([])
  })
})

describe('generateEntry approvedBy', () => {
  const parsedData: Partial<AutomationEntry> = {
    username: 'testuser',
    id: 123456,
    reason: 'Test reason',
  }

  it('records the reviewers whose 👍 carried the report', () => {
    const entry = generateEntry(
      parsedData,
      'https://github.com/test/issue/1',
      'reporter',
      '2024-01-15',
      ['alice', 'bob'],
    )
    expect(entry.approvedBy).toEqual(['alice', 'bob'])
  })

  // Older entries have no votes at all, so an entry added without them has to
  // read the same way rather than carrying an empty array.
  it('omits the key entirely when there are no approvals', () => {
    const entry = generateEntry(
      parsedData,
      'https://github.com/test/issue/1',
      'reporter',
      '2024-01-15',
      [],
    )
    expect('approvedBy' in entry).toBe(false)
  })

  it('omits the key when no list is passed at all', () => {
    const entry = generateEntry(
      parsedData,
      'https://github.com/test/issue/1',
      'reporter',
      '2024-01-15',
    )
    expect('approvedBy' in entry).toBe(false)
  })

  it('serialises with approvedBy last, leaving the existing key order alone', () => {
    const entry = generateEntry(
      parsedData,
      'https://github.com/test/issue/1',
      'reporter',
      '2024-01-15',
      ['alice'],
    )
    expect(Object.keys(entry)).toEqual([
      'username',
      'id',
      'reason',
      'issueUrl',
      'reportedBy',
      'createdAt',
      'approvedBy',
    ])
  })
})
