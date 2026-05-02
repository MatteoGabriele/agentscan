import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  parseIssueBody,
  validateEntry,
  generateEntry,
  type AutomationEntry,
} from "../parse-automation-issue";

// Mock console.error to suppress output during tests
beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("parseIssueBody", () => {
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
- [x] I understand this may be reviewed by maintainers before approval`;

  it("should parse GitHub username correctly", () => {
    const parsed = parseIssueBody(sampleIssueBody);
    expect(parsed.username).toBe("nanookclaw");
  });

  it("should parse GitHub User ID as number", () => {
    const parsed = parseIssueBody(sampleIssueBody);
    expect(parsed.id).toBe(258741235);
    expect(typeof parsed.id).toBe("number");
  });

  it("should parse and clean reason field", () => {
    const parsed = parseIssueBody(sampleIssueBody);
    expect(parsed.reason).toContain("unsolicited comment");
    expect(parsed.reason).toContain("claw");
    // Should be a single line (no double newlines)
    expect(parsed.reason).not.toContain("\n\n");
  });

  it("should handle minimal form input", () => {
    const minimalBody = `### GitHub Username

testuser

### GitHub User ID

123456

### Why do you believe this is an automated account?

Suspicious behavior`;

    const parsed = parseIssueBody(minimalBody);
    expect(parsed.username).toBe("testuser");
    expect(parsed.id).toBe(123456);
    expect(parsed.reason).toBe("Suspicious behavior");
  });

  it("should handle missing fields gracefully", () => {
    const incompleteBody = `### GitHub Username

testuser`;

    const parsed = parseIssueBody(incompleteBody);
    expect(parsed.username).toBe("testuser");
    expect(parsed.id).toBeUndefined();
    expect(parsed.reason).toBeUndefined();
  });
});

describe("validateEntry", () => {
  it("should validate a complete entry", () => {
    const entry: Partial<AutomationEntry> = {
      username: "testuser",
      id: 123456,
      reason: "Suspicious behavior",
      issueUrl: "https://github.com/test/issue/1",
      createdAt: "2024-01-01",
    };
    expect(validateEntry(entry)).toBe(true);
  });

  it("should reject entry missing username", () => {
    const entry: Partial<AutomationEntry> = {
      id: 123456,
      reason: "Suspicious",
      issueUrl: "https://github.com/test/issue/1",
      createdAt: "2024-01-01",
    };
    expect(validateEntry(entry)).toBe(false);
  });

  it("should reject entry missing id", () => {
    const entry: Partial<AutomationEntry> = {
      username: "testuser",
      reason: "Suspicious",
      issueUrl: "https://github.com/test/issue/1",
      createdAt: "2024-01-01",
    };
    expect(validateEntry(entry)).toBe(false);
  });

  it("should reject entry missing reason", () => {
    const entry: Partial<AutomationEntry> = {
      username: "testuser",
      id: 123456,
      issueUrl: "https://github.com/test/issue/1",
      createdAt: "2024-01-01",
    };
    expect(validateEntry(entry)).toBe(false);
  });

  it("should reject entry missing issueUrl", () => {
    const entry: Partial<AutomationEntry> = {
      username: "testuser",
      id: 123456,
      reason: "Suspicious",
      createdAt: "2024-01-01",
    };
    expect(validateEntry(entry)).toBe(false);
  });
});

describe("generateEntry", () => {
  const parsedData: Partial<AutomationEntry> = {
    username: "testuser",
    id: 123456,
    reason: "Test reason",
  };

  it("should generate a complete entry", () => {
    const entry = generateEntry(parsedData, "https://github.com/test/issue/1");
    expect(entry.username).toBe("testuser");
    expect(entry.id).toBe(123456);
    expect(entry.reason).toBe("Test reason");
    expect(entry.issueUrl).toBe("https://github.com/test/issue/1");
    expect(entry.createdAt).toBeDefined();
  });

  it("should use provided createdAt date", () => {
    const entry = generateEntry(
      parsedData,
      "https://github.com/test/issue/1",
      "2024-01-15",
    );
    expect(entry.createdAt).toBe("2024-01-15");
  });

  it("should generate ISO date when createdAt is not provided", () => {
    const entry = generateEntry(parsedData, "https://github.com/test/issue/1");
    // Check it's in YYYY-MM-DD format
    expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should handle empty issueUrl", () => {
    const entry = generateEntry(parsedData, "");
    expect(entry.issueUrl).toBe("");
  });
});

describe("Integration: Full parsing workflow", () => {
  const sampleIssueBody = `### GitHub Username

nanookclaw

### GitHub User ID

258741235

### Why do you believe this is an automated account?

This is suspicious behavior.

### Supporting Evidence

- Some evidence here`;

  it("should parse, validate, and generate entry successfully", () => {
    const parsed = parseIssueBody(sampleIssueBody);
    const entry = generateEntry(
      parsed,
      "https://github.com/biomejs/biome/pull/4891#issuecomment-4323263151",
      "2024-04-28",
    );

    expect(validateEntry(entry)).toBe(true);
    expect(entry.username).toBe("nanookclaw");
    expect(entry.id).toBe(258741235);
    expect(entry.reason).toBe("This is suspicious behavior.");
    expect(entry.issueUrl).toBe(
      "https://github.com/biomejs/biome/pull/4891#issuecomment-4323263151",
    );
    expect(entry.createdAt).toBe("2024-04-28");
  });
});
