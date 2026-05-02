/// <reference types="node" />

import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Octokit } from "octokit";

// Configuration
const STATIC_SALT = "agentscan-v1";
const USERS_TO_SCAN = 100;
const MAX_PAGES = 1; // We'll expand if needed
const API_TIMEOUT = 10000; // 10 seconds timeout for API calls
const API_BASE_URL = "https://agentscan.netlify.app";
const DELAY_BETWEEN_SCANS = 500; // 500ms conservative delay between API calls

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
  userCreatedAt: string,
): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(
      `${API_BASE_URL}/api/identify-replicant/${encodeURIComponent(username)}?created_at=${userCreatedAt}&pages=2`,
      { signal: controller.signal },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `Failed to scan ${username}: HTTP ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();
    return data.score ?? null;
  } catch (error) {
    if ((error as any).name === "AbortError") {
      console.error(
        `Timeout scanning ${username} (API took longer than ${API_TIMEOUT}ms)`,
      );
    } else if (error instanceof SyntaxError) {
      console.error(`Invalid JSON response from API for ${username}`);
    } else {
      console.error(`Error scanning ${username}:`, (error as Error).message);
    }
    return null;
  }
}

/**
 * Search for GitHub users using a rolling window approach
 * This provides unbiased selection by cycling through different account creation dates
 * rather than filtering by account age
 */
async function searchUsers(octokit: Octokit, pageNumber: number) {
  // Use a rolling window: cycle through a year of different creation dates
  // This ensures we don't bias toward older or newer accounts
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const window = daysSinceEpoch % 365; // Cycles through 0-364

  const searchDate = new Date();
  searchDate.setDate(searchDate.getDate() - window);
  const dateStart = searchDate.toISOString().split("T")[0];

  const nextDay = new Date(searchDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const dateEnd = nextDay.toISOString().split("T")[0];

  // Search for users created on this specific day (unbiased)
  const query = `created:${dateStart}..${dateEnd}`;

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
      created_at: user.created_at,
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

  // Count how many results with actual scores we already have today
  const resultsWithScoresToday = scanResults.filter(
    (r) => r.date === today && r.score !== null,
  ).length;
  const usersNeeded = Math.max(0, USERS_TO_SCAN - resultsWithScoresToday);

  let completedCount = 0;
  let pageNumber = 1;

  console.log(
    `Starting daily scan - Need ${usersNeeded} more users with analysis (${resultsWithScoresToday} already done today)`,
  );

  if (usersNeeded === 0) {
    console.log("✓ Already have 100 users with analysis for today");
    return;
  }

  // Loop through pages until we've scanned enough users with actual analysis
  while (completedCount < usersNeeded && pageNumber <= MAX_PAGES) {
    console.log(`\nSearching page ${pageNumber}...`);
    const users = await searchUsers(octokit, pageNumber);

    if (users.length === 0) {
      console.log("No more users found");
      break;
    }

    for (const user of users) {
      if (completedCount >= usersNeeded) {
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
      const score = await scanUser(user.login, user.created_at);

      // Only save results with actual scores
      if (score !== null) {
        const result: ScanResult = {
          date: today,
          hash,
          score,
        };

        scanResults.push(result);
        completedCount++;
        console.log(
          `✓ Completed [${resultsWithScoresToday + completedCount}/${USERS_TO_SCAN}]`,
        );
      } else {
        console.log(`✗ No score available, skipping this user`);
      }

      // Always mark the user as scanned (even if no score) to avoid re-scanning
      scannedHashes.set(hash, {
        hash,
        scannedAt: today,
      });

      // Conservative delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_SCANS));
    }

    pageNumber++;
  }

  // Save the updated data
  saveScannedHashes(scannedHashes);
  saveScanResults(scanResults);

  console.log(
    `\n✓ Scan complete: ${completedCount} new users with analysis scanned today`,
  );
  console.log(
    `Total users with analysis: ${scanResults.filter((r) => r.score !== null).length}`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
