/// <reference types="node" />

import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Octokit } from "octokit";

// Configuration
const STATIC_SALT = "agentscan-v1";
const USERS_TO_SCAN = 100;
const MAX_PAGES = 1; // We'll expand if needed

interface ScannedHash {
  hash: string;
  scannedAt: string;
}

interface ScanResult {
  date: string;
  hash: string;
  score: number | null;
  error?: string;
}

/**
 * Generate a deterministic one-way hash for a user ID
 * Same userId will always produce the same hash
 */
function generateUserHash(userId: number): string {
  return createHash("sha256").update(`${userId}:${STATIC_SALT}`).digest("hex");
}

/**
 * Load existing scanned user hashes
 */
function loadScannedHashes(): Map<string, ScannedHash> {
  const filePath = join(process.cwd(), "data", "scanned-users-hashes.json");
  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return new Map(Object.entries(data));
  } catch {
    return new Map();
  }
}

/**
 * Save scanned user hashes
 */
function saveScannedHashes(hashes: Map<string, ScannedHash>): void {
  const filePath = join(process.cwd(), "data", "scanned-users-hashes.json");
  const data = Object.fromEntries(hashes);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Load existing scan results
 */
function loadScanResults(): ScanResult[] {
  const filePath = join(process.cwd(), "data", "scan-results.json");
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

/**
 * Save scan results
 */
function saveScanResults(results: ScanResult[]): void {
  const filePath = join(process.cwd(), "data", "scan-results.json");
  writeFileSync(filePath, JSON.stringify(results, null, 2));
}

/**
 * Get the analysis score for a user via the identify-replicant API
 */
async function scanUser(
  username: string,
  octokit: Octokit,
): Promise<number | null> {
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL || "http://localhost:3000"}/api/identify-replicant/${encodeURIComponent(username)}?created_at=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}&pages=1`,
    );

    if (!response.ok) {
      console.error(`Failed to scan ${username}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.score ?? null;
  } catch (error) {
    console.error(`Error scanning ${username}:`, error);
    return null;
  }
}

/**
 * Search for GitHub users created at least 30 days ago
 */
async function searchUsers(octokit: Octokit, pageNumber: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const createdBefore = thirtyDaysAgo.toISOString().split("T")[0];

  const query = `created:<${createdBefore}`;

  try {
    const response = await octokit.rest.search.users({
      q: query,
      per_page: 100,
      page: pageNumber,
      sort: "joined",
      order: "desc",
    });

    return response.data.items.map((user) => ({
      id: user.id,
      login: user.login,
    }));
  } catch (error) {
    console.error(`Error searching users (page ${pageNumber}):`, error);
    return [];
  }
}

/**
 * Main scanning function
 */
async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  const octokit = new Octokit({ auth: token });
  const scannedHashes = loadScannedHashes();
  const scanResults = loadScanResults();
  const today = new Date().toISOString().split("T")[0];

  let scannedCount = 0;
  let pageNumber = 1;

  console.log(`Starting daily scan - Target: ${USERS_TO_SCAN} users`);

  // Loop through pages until we've scanned enough users
  while (scannedCount < USERS_TO_SCAN && pageNumber <= MAX_PAGES) {
    console.log(`\nSearching page ${pageNumber}...`);
    const users = await searchUsers(octokit, pageNumber);

    if (users.length === 0) {
      console.log("No more users found");
      break;
    }

    for (const user of users) {
      if (scannedCount >= USERS_TO_SCAN) {
        break;
      }

      const hash = generateUserHash(user.id);

      // Skip if already scanned
      if (scannedHashes.has(hash)) {
        console.log(
          `⊘ Skipping user ${user.login} (ID: ${user.id}) - already scanned`,
        );
        continue;
      }

      // Scan the user
      console.log(`→ Scanning user ${user.login} (ID: ${user.id})...`);
      const score = await scanUser(user.login, octokit);

      // Record the result (no userId or username for privacy)
      const result: ScanResult = {
        date: today,
        hash,
        score,
      };

      scanResults.push(result);
      scannedHashes.set(hash, {
        hash,
        scannedAt: today,
      });

      scannedCount++;
      console.log(`✓ Completed [${scannedCount}/${USERS_TO_SCAN}]`);

      // Add a small delay between API calls to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    pageNumber++;
  }

  // Save the updated data
  saveScannedHashes(scannedHashes);
  saveScanResults(scanResults);

  console.log(`\n✓ Scan complete: ${scannedCount} new users scanned today`);
  console.log(`Total scanned users in history: ${scannedHashes.size}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
