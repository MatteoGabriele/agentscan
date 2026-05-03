/// <reference types="node" />

import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Octokit } from "octokit";
import { IdentifyResult } from "@unveil/identity";

// Configuration
const STATIC_SALT = "agentscan-v1";
const USERS_TO_SCAN = 100;
const MAX_PAGES = 10; // Search up to 10 pages to find enough unscanned users
const API_TIMEOUT = 10000; // 10 seconds timeout for API calls
const API_BASE_URL = "https://agentscan.netlify.app";
const DELAY_BETWEEN_SCANS = 1000; // 1 second conservative delay between identify-replicant API calls
const DELAY_BETWEEN_GITHUB_CALLS = 200; // 200ms delay between GitHub API calls (random user fetches)

interface ScannedHash {
  hash: string;
  scannedAt: string;
}

interface ScanResult {
  created_at: string;
  hash: string;
  score: number;
  user_created_at: string;
  user_public_repos_count: number;
  events_count: number;
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

type ScanUserResponse = {
  analysis: IdentifyResult;
  eventsCount: number;
};

/**
 * Get the analysis score for a user via the identify-replicant API
 */
async function scanUser(
  username: string,
  userCreatedAt: string,
  publicRepos: number,
): Promise<ScanUserResponse | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(
      `${API_BASE_URL}/api/identify-replicant/${username}?created_at=${userCreatedAt}&repos_count=${publicRepos}&pages=2`,
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

    console.log(`  API Response:`, JSON.stringify(data, null, 2));

    return data ?? null;
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
 * Fetch active GitHub users from trending repositories
 * Gets contributors from popular repos - ensures we sample actually active users
 */
async function searchUsers(octokit: Octokit, pageNumber: number) {
  const BATCH_SIZE = 100;
  const users: Array<{
    id: number;
    login: string;
    created_at: string;
    public_repos: number;
  }> = [];

  try {
    // Get trending repos from the last 7-14 days, varying by page to get different repos
    const daysAgo = 7 + pageNumber * 2; // Page 1: 9 days ago, Page 2: 11 days ago, etc.
    const trendingDate = new Date();
    trendingDate.setDate(trendingDate.getDate() - daysAgo);
    const dateString = trendingDate.toISOString().split("T")[0];

    const trendingRepos = await octokit.rest.search.repos({
      q: `created:>${dateString} stars:>5`,
      sort: "stars",
      order: "desc",
      per_page: 100, // Get more repos per page
      page: pageNumber, // Use pageNumber to get different results
    });

    console.log(
      `Page ${pageNumber}: Found ${trendingRepos.data.items.length} trending repositories`,
    );

    const seenLogins = new Set<string>();

    // Extract contributors from each repo
    for (const repo of trendingRepos.data.items) {
      if (users.length >= BATCH_SIZE) break;

      // Skip if repo has no owner
      if (!repo.owner) continue;

      try {
        const contributors = await octokit.rest.repos.listContributors({
          owner: repo.owner.login,
          repo: repo.name,
          per_page: 100,
        });

        // Get full profiles for contributors (search API returns limited data)
        for (const contributor of contributors.data) {
          if (users.length >= BATCH_SIZE) break;
          if (!contributor.login) continue;
          if (seenLogins.has(contributor.login)) continue;

          try {
            const fullProfile = await octokit.rest.users.getByUsername({
              username: contributor.login,
            });

            users.push({
              id: fullProfile.data.id,
              login: fullProfile.data.login,
              created_at: fullProfile.data.created_at,
              public_repos: fullProfile.data.public_repos,
            });

            seenLogins.add(contributor.login);
          } catch (error) {
            console.error(
              `Error fetching profile for ${contributor.login}:`,
              (error as Error).message,
            );
          }

          // Rate limiting between GitHub API calls
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_GITHUB_CALLS),
          );
        }
      } catch (error) {
        console.error(
          `Error fetching contributors for ${repo.full_name}:`,
          (error as Error).message,
        );
      }
    }

    if (users.length === 0) {
      console.error(
        "Could not find any active users from trending repositories",
      );
    }
  } catch (error) {
    console.error("Error searching trending repositories:", error);
  }

  return users;
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
    (r) => r.created_at === today && r.score !== null,
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

      // Scan the user (all contributors from trending repos are valid for trend data)
      console.log(`→ Scanning user ${user.login} (ID: ${user.id})...`);
      console.log(`  User data:`, JSON.stringify(user, null, 2));
      const scanData = await scanUser(
        user.login,
        user.created_at,
        user.public_repos,
      );

      const score = scanData?.analysis.score;
      const eventsCount = scanData?.eventsCount ?? 0;

      // Save all results with valid scores (contributors from trending repos = valid trend data)
      if (score != null) {
        const result: ScanResult = {
          created_at: today,
          hash,
          score,
          user_created_at: user.created_at,
          user_public_repos_count: user.public_repos,
          events_count: eventsCount,
        };

        scanResults.push(result);

        // Mark as scanned only if analysis was successful
        scannedHashes.set(hash, {
          hash,
          scannedAt: today,
        });

        completedCount++;
        console.log(
          `✓ Completed [${resultsWithScoresToday + completedCount}/${USERS_TO_SCAN}]`,
        );
      } else {
        console.log(`✗ No score available`);
      }

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
