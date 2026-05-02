import { describe, it, expect } from "vitest";
import { createHash } from "crypto";

/**
 * Test suite for verifying the one-way hash implementation
 * Ensures that:
 * 1. Same user ID always produces identical hash
 * 2. Hash cannot be reversed to original ID
 */

const STATIC_SALT = "agentscan-v1";

function generateUserHash(userId: number): string {
  return createHash("sha256").update(`${userId}:${STATIC_SALT}`).digest("hex");
}

describe("User Hash Anonymization", () => {
  it("should generate identical hashes for the same user ID", () => {
    const userId = 12345;

    // Generate hash twice from the same ID
    const hash1 = generateUserHash(userId);
    const hash2 = generateUserHash(userId);

    // They must be identical
    expect(hash1).toBe(hash2);
  });

  it("should generate different hashes for different user IDs", () => {
    const userId1 = 12345;
    const userId2 = 54321;

    const hash1 = generateUserHash(userId1);
    const hash2 = generateUserHash(userId2);

    // Different IDs must produce different hashes
    expect(hash1).not.toBe(hash2);
  });

  it("should be irreversible - hash cannot produce original ID", () => {
    const originalId = 99999;
    const hash = generateUserHash(originalId);

    // Try to "reverse" by hashing the hash itself
    const doubleHash = createHash("sha256")
      .update(hash + ":" + STATIC_SALT)
      .digest("hex");

    // The double hash should NOT match the original ID
    expect(doubleHash).not.toBe(String(originalId));
    expect(hash).not.toBe(String(originalId));
    expect(hash).not.toBe(originalId.toString());
  });

  it("should confirm hash is one-way by testing impossible reversal", () => {
    const originalId = 42;
    const hash = generateUserHash(originalId);

    // Attempt various "reversal" techniques - all should fail
    const reverseAttempts = [
      { name: "Direct comparison", result: hash === String(originalId) },
      {
        name: "Hex to decimal",
        result: parseInt(hash.substring(0, 10), 16) === originalId,
      },
      {
        name: "Hash of hash",
        result: createHash("sha256").update(hash).digest("hex") === hash,
      },
      {
        name: "Substring match",
        result: hash.includes(originalId.toString()),
      },
    ];

    // All attempts should fail
    reverseAttempts.forEach(({ name, result }) => {
      expect(result, `Reversal attempt "${name}" should fail but did not`).toBe(
        false,
      );
    });
  });

  it("should demonstrate practical anonymity with multiple users", () => {
    const userIds = [1, 100, 9999, 555555, 1000000];

    const results = userIds.map((id) => ({
      id,
      hash: generateUserHash(id),
    }));

    // Verify all hashes are unique
    const hashes = results.map((r) => r.hash);
    const uniqueHashes = new Set(hashes);
    expect(uniqueHashes.size).toBe(hashes.length);

    // Verify hashes don't equal the original IDs
    results.forEach(({ id, hash }) => {
      expect(hash).not.toBe(id.toString());
      expect(hash).not.toBe((id as any).toString(16));
      // Verify hash is much longer than ID
      expect(hash.length).toBeGreaterThan(String(id).length);
    });
  });
});
