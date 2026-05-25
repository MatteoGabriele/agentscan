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
  user_id: number;
  score: number;
  user_created_at: string;
  user_public_repos_count: number;
  events_count: number;
  repo_name: string;
}

/**
 * Load verified automations list
 */
function loadVerifiedAutomations(): Set<number> {
  const filePath = join(
    process.cwd(),
    "data",
    "verified-automations-list.json",
  );
  try {
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    return new Set(data.map((item: any) => item.id));
  } catch {
    return new Set();
  }
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
 * Check if a username is a known bot
 */
function isKnownBot(username: string): boolean {
  const botPatterns = [
    "dependabot",
    "renovate",
    "greenkeeper",
    "github-actions",
    "stale",
    "snyk",
    "codecov",
    "coveralls",
    "travis",
    "circle",
    "appveyor",
    "azure-pipelines",
    "netlify",
    "vercel",
    "heroku",
    "aws-amplify",
  ];

  const lowerUsername = username.toLowerCase();
  return (
    botPatterns.some((pattern) => lowerUsername.includes(pattern)) ||
    lowerUsername.endsWith("[bot]")
  );
}

/**
 * Fetch PR authors from curated list of popular OSS libraries and frameworks
 * Gets the first 10 PRs from each repo - collects all authors including duplicates, skipping known bots
 */
async function searchUsers(octokit: Octokit) {
  const PRS_PER_REPO = 10;

  const libraries = [
    "nuxt/nuxt",
    "vuejs/vue",
    "facebook/react",
    "sveltejs/svelte",
    "vitejs/vite",
    "vitest-dev/vitest",
    "vercel/next.js",
    "withastro/astro",
    "biomejs/biome",
    "tanstack/query-core",
    "solidjs/solid",
    "webpro-nl/knip",
    "eslint/eslint",
    "python/cpython",
    "rolldown/rolldown",
  ];

  const users: Array<{
    id: number;
    login: string;
    created_at: string;
    public_repos: number;
    repo_name: string;
  }> = [];

  try {
    console.log(
      `\nFetching PR authors from ${libraries.length} curated OSS libraries/frameworks`,
    );

    // Loop through each curated repo and get 10 PRs
    for (const repoFullName of libraries) {
      const [owner, repo] = repoFullName.split("/");

      console.log(`\n  → ${repoFullName}`);

      let prsFromThisRepo = 0;

      try {
        // Get recent PRs from this repo - fetch more to account for bots being filtered out
        const prs = await octokit.rest.pulls.list({
          owner,
          repo,
          state: "all",
          sort: "created",
          direction: "desc",
          per_page: 50, // Fetch 50 to ensure we get 10 non-bot authors
        });

        console.log(`    Found ${prs.data.length} recent PRs`);

        // Extract authors from PRs - skip known bots, include duplicates
        for (const pr of prs.data) {
          if (prsFromThisRepo >= PRS_PER_REPO) break;
          if (!pr.user?.login) continue;

          // Skip known bots
          if (isKnownBot(pr.user.login)) {
            console.log(`      ⊘ ${pr.user.login} (bot - skipped)`);
            continue;
          }

          try {
            const fullProfile = await octokit.rest.users.getByUsername({
              username: pr.user.login,
            });

            users.push({
              id: fullProfile.data.id,
              login: fullProfile.data.login,
              created_at: fullProfile.data.created_at,
              public_repos: fullProfile.data.public_repos,
              repo_name: repoFullName,
            });

            prsFromThisRepo++;
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

        console.log(
          `    Collected ${prsFromThisRepo}/${PRS_PER_REPO} authors from this repo`,
        );
      } catch (error) {
        console.error(
          `    Error fetching PRs for ${repoFullName}:`,
          (error as Error).message,
        );
      }
    }

    if (users.length === 0) {
      console.error("Could not find any PR authors from OSS libraries");
    } else {
      console.log(
        `\nSuccessfully fetched ${users.length} PR authors (${(users.length / libraries.length).toFixed(1)} per repo avg)`,
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
  const scanResults = loadScanResults();
  const verifiedAutomations = loadVerifiedAutomations();
  const now = new Date().toISOString();

  console.log(`Starting daily snapshot scan for ${now}`);
  console.log(`Loaded ${verifiedAutomations.size} verified automations`);

  const users = await searchUsers(octokit);

  if (users.length === 0) {
    console.error("No users found to scan");
    process.exit(1);
  }

  console.log(`\nScanning ${users.length} unique PR authors...`);

  let completedCount = 0;
  const repoScores: Map<string, number> = new Map();

  for (const user of users) {
    // Scan every user - we want a fresh daily snapshot
    console.log(`→ Scanning user ${user.login} (ID: ${user.id})...`);

    const scanData = await scanUser(
      user.login,
      user.created_at,
      user.public_repos,
    );

    let score = scanData?.analysis.score;
    const eventsCount = scanData?.eventsCount ?? 0;

    // Check if user is in verified automations list
    if (verifiedAutomations.has(user.id)) {
      console.log(` User is in verified automations list, setting score to 0`);
      score = 0;
    }

    // Save all results regardless of whether they were scanned before
    if (score != null) {
      const result: ScanResult = {
        created_at: now,
        user_id: user.id,
        score,
        user_created_at: user.created_at,
        user_public_repos_count: user.public_repos,
        events_count: eventsCount,
        repo_name: user.repo_name,
      };

      scanResults.push(result);

      // Track score by repository
      const currentScore = repoScores.get(user.repo_name) ?? 0;
      repoScores.set(user.repo_name, currentScore + score);

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
    `\n✓ Daily snapshot complete: ${completedCount} PR authors analyzed for ${now}`,
  );
  console.log(`Total historical scan results: ${scanResults.length}`);

  // Log score aggregation by repository
  console.log(`\nScore Summary by Repository:`);
  const sortedRepos = Array.from(repoScores.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [repo, totalScore] of sortedRepos) {
    console.log(`  ${repo}: ${totalScore.toFixed(2)}`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
