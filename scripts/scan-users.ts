/// <reference types="node" />

import { cicdBots, libraries } from "../shared/daily-scan";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Octokit } from "octokit";
import { IdentifyResult } from "@unveil/identity";
import { hashPrId } from "./pr-hash";

// Configuration
const API_TIMEOUT = 10000; // 10 seconds timeout for API calls
const API_BASE_URL = "https://agentscan.tools";
const DELAY_BETWEEN_SCANS = 1000; // 1 second conservative delay between identify-replicant API calls
const DELAY_BETWEEN_GITHUB_CALLS = 200; // 200ms delay between GitHub API calls (random user fetches)

interface ScanResult {
  created_at: string;
  score: number;
  user_created_at: string;
  user_public_repos_count: number;
  events_count: number;
  repo_name: string;
  pr_key: string;
  pr_status: string;
}

interface ScanOptions {
  dryRun?: boolean;
  prsPerRepo?: number;
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
function saveScanResults(results: ScanResult[], dryRun: boolean = false): void {
  if (dryRun) {
    return;
  }
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
      console.error(`Failed to scan user: HTTP ${response.status} ${response.statusText}`);
      return null;
    }

    const data: ScanUserResponse = await response.json();

    return data ?? null;
  } catch (error) {
    if ((error as any).name === "AbortError") {
      console.error(`Timeout scanning user (API took longer than ${API_TIMEOUT}ms)`);
    } else if (error instanceof SyntaxError) {
      console.error(`Invalid JSON response from API`);
    } else {
      console.error(`Error scanning user:`, (error as Error).message);
    }
    return null;
  }
}

/**
 * Check if a username is a known bot
 */
function isKnownBot(username: string): boolean {
  const lowerUsername = username.toLowerCase();
  return (
    cicdBots.some((name) => lowerUsername.includes(name)) ||
    lowerUsername.endsWith("[bot]")
  );
}

/**
 * Fetch PR authors from curated list of popular OSS libraries and frameworks
 * Gets the specified number of PRs from each repo - collects all authors including duplicates, skipping known bots
 */
async function searchUsers(octokit: Octokit, prsPerRepo: number = 10) {
  const PRS_PER_REPO = prsPerRepo;

  const users: Array<{
    id: number;
    login: string;
    created_at: string;
    public_repos: number;
    repo_name: string;
    pr_key: string;
    pr_status: string;
  }> = [];

  try {
    // Loop through each curated repo and get PRs
    for (const repoFullName of libraries) {
      const [owner, repo] = repoFullName.split("/");

      let prsFromThisRepo = 0;

      try {
        // Get recent PRs from this repo - fetch more to account for bots being filtered out
        const prs = await octokit.rest.pulls.list({
          owner,
          repo,
          state: "all",
          sort: "created",
          direction: "desc",
          per_page: 50, // Fetch 50 to ensure we get enough non-bot authors
        });

        // Extract authors from PRs - skip known bots, include duplicates
        for (const pr of prs.data) {
          if (prsFromThisRepo >= PRS_PER_REPO) break;
          if (!pr.user?.login) continue;

          if (isKnownBot(pr.user.login)) {
            console.log(`  ${repoFullName}: skipping known bot`);
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
              pr_key: hashPrId(repoFullName, pr.number),
              pr_status: pr.state,
              public_repos: fullProfile.data.public_repos,
              repo_name: repoFullName,
            });

            prsFromThisRepo++;
            console.log(`  ${repoFullName}: ${prsFromThisRepo}/${PRS_PER_REPO}`);
          } catch (error) {
            console.error(`Error fetching user profile:`, (error as Error).message);
          }

          // Rate limiting between GitHub API calls
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_GITHUB_CALLS),
          );
        }
      } catch (error) {
        console.error(`Error fetching PRs for ${repoFullName}:`, (error as Error).message);
      }
    }
  } catch (error) {
    console.error(`Error searching repositories:`, (error as Error).message);
  }

  return users;
}

/**
 * Main scanning function
 */
export async function main(options: ScanOptions = {}) {
  const { dryRun = false, prsPerRepo = 10 } = options;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  const octokit = new Octokit({ auth: token });
  const scanResults = dryRun ? [] : loadScanResults();
  const verifiedAutomations = loadVerifiedAutomations();
  const now = new Date().toISOString();

  const users = await searchUsers(octokit, prsPerRepo);

  if (users.length === 0) {
    console.error("No users found to scan");
    process.exit(1);
  }

  let completedCount = 0;
  const repoScores: Map<string, number> = new Map();

  for (const user of users) {
    const scanData = await scanUser(
      user.login,
      user.created_at,
      user.public_repos,
    );

    let score = scanData?.analysis.score;
    const eventsCount = scanData?.eventsCount ?? 0;

    if (verifiedAutomations.has(user.id)) {
      score = 0;
    }

    if (score != null) {
      const result: ScanResult = {
        created_at: now,
        score,
        pr_key: user.pr_key,
        pr_status: user.pr_status,
        user_created_at: user.created_at,
        user_public_repos_count: user.public_repos,
        events_count: eventsCount,
        repo_name: user.repo_name,
      };

      scanResults.push(result);

      const currentScore = repoScores.get(user.repo_name) ?? 0;
      repoScores.set(user.repo_name, currentScore + score);

      completedCount++;
    }

    // Conservative delay between API calls to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_SCANS));
  }

  saveScanResults(scanResults, dryRun);

  // Score summary by repository
  const sortedRepos = Array.from(repoScores.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [repo, totalScore] of sortedRepos) {
    console.log(`${repo}: ${totalScore.toFixed(2)}`);
  }
}

// Run with default options when executed directly (for workflow)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
