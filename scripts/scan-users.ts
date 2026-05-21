/// <reference types="node" />

import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Octokit } from "octokit";
import { IdentifyResult } from "@unveil/identity";

// Configuration
const STATIC_SALT = "agentscan-v1";
const API_TIMEOUT = 10000; // 10 seconds timeout for API calls
const API_BASE_URL = "https://agentscan.tools";
const DELAY_BETWEEN_SCANS = 1000; // 1 second conservative delay between identify-replicant API calls
const DELAY_BETWEEN_GITHUB_CALLS = 200; // 200ms delay between GitHub API calls (random user fetches)

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
 * Fetch PR authors from the top 10 most-starred repositories
 * Gets authors from recent pull requests - captures who's actively contributing to trending code
 */
async function searchUsers(octokit: Octokit) {
  const TARGET_USERS = 10;
  const users: Array<{
    id: number;
    login: string;
    created_at: string;
    public_repos: number;
  }> = [];
  const seenLogins = new Set<string>();

  try {
    // Get top 15 most-starred repos (in case we need more to find 10 unique users)
    const trendingRepos = await octokit.rest.search.repos({
      q: `stars:>5000`,
      sort: "stars",
      order: "desc",
      per_page: 15, // Get more repos as fallback
    });

    if (trendingRepos.data.items.length === 0) {
      console.error("No trending repositories found");
      return users;
    }

    console.log(
      `\nFetching PR authors from top ${trendingRepos.data.items.length} most-starred repos`,
    );

    // Loop through each trending repo
    for (const repo of trendingRepos.data.items) {
      if (users.length >= TARGET_USERS) break;
      if (!repo.owner) continue;

      console.log(`\n  → ${repo.full_name} (⭐ ${repo.stargazers_count})`);

      try {
        // Get recent PRs from this repo
        const prs = await octokit.rest.pulls.list({
          owner: repo.owner.login,
          repo: repo.name,
          state: "all",
          sort: "created",
          direction: "desc",
          per_page: 100, // Get more PRs to ensure we find unique authors
        });

        console.log(`    Found ${prs.data.length} recent PRs`);

        // Extract authors from PRs
        for (const pr of prs.data) {
          if (users.length >= TARGET_USERS) break;
          if (!pr.user?.login) continue;
          if (seenLogins.has(pr.user.login)) continue;

          try {
            const fullProfile = await octokit.rest.users.getByUsername({
              username: pr.user.login,
            });

            users.push({
              id: fullProfile.data.id,
              login: fullProfile.data.login,
              created_at: fullProfile.data.created_at,
              public_repos: fullProfile.data.public_repos,
            });

            seenLogins.add(pr.user.login);
            console.log(`      • ${pr.user.login}`);
          } catch (error) {
            console.error(
              `      ✗ Error fetching profile for ${pr.user.login}:`,
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
          `    Error fetching PRs for ${repo.full_name}:`,
          (error as Error).message,
        );
      }
    }

    if (users.length === 0) {
      console.error("Could not find any PR authors from trending repositories");
    } else {
      console.log(`\nSuccessfully fetched ${users.length} unique PR authors`);
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
  const scanResults = loadScanResults();
  const today = new Date().toISOString().split("T")[0];

  console.log(`Starting daily snapshot scan for ${today}`);

  const users = await searchUsers(octokit);

  if (users.length === 0) {
    console.error("No users found to scan");
    process.exit(1);
  }

  console.log(`\nScanning ${users.length} unique PR authors...`);

  let completedCount = 0;

  for (const user of users) {
    const hash = generateUserHash(user.id);

    // Scan every user - we want a fresh daily snapshot
    console.log(`→ Scanning user ${user.login} (ID: ${user.id})...`);
    const scanData = await scanUser(
      user.login,
      user.created_at,
      user.public_repos,
    );

    const score = scanData?.analysis.score;
    const eventsCount = scanData?.eventsCount ?? 0;

    // Save all results regardless of whether they were scanned before
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

      completedCount++;
      console.log(`✓ Completed [${completedCount}/${users.length}]`);
    } else {
      console.log(`✗ No score available`);
    }

    // Conservative delay between API calls to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_SCANS));
  }

  // Save the updated data
  saveScanResults(scanResults);

  console.log(
    `\n✓ Daily snapshot complete: ${completedCount} PR authors analyzed for ${today}`,
  );
  console.log(`Total historical scan results: ${scanResults.length}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
