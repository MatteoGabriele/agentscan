/// <reference types="node" />

import { cicdBots, libraries } from "../shared/daily-scan";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Octokit } from "octokit";
import { IdentifyResult } from "@unveil/identity";
import { hashPrId } from "./pr-hash";
import {
  pack,
  unpack,
} from "../shared/utils/compactor";

// Configuration
const API_TIMEOUT = 30000; // 30 seconds timeout for API calls
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
  const filePath = join(process.cwd(), "data", "scan-results.txt");
  try {
    return unpack(readFileSync(filePath, "utf-8")) as ScanResult[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * Save scan results
 */
function saveScanResults(results: ScanResult[], dryRun: boolean = false): void {
  if (dryRun) {
    return;
  }
  const filePath = join(process.cwd(), "data", "scan-results.txt");
  writeFileSync(filePath, pack(results));
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

    if (!response.ok) {
      clearTimeout(timeoutId);
      console.error(
        `Failed to scan user: HTTP ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data: ScanUserResponse = await response.json();
    clearTimeout(timeoutId);

    return data ?? null;
  } catch (error) {
    if ((error as any).name === "AbortError") {
      console.error(
        `Timeout scanning user (API took longer than ${API_TIMEOUT}ms)`,
      );
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
type RepoScanStatus = { count: number; failed: boolean };

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

  const repoStatus = new Map<string, RepoScanStatus>();

  for (const repoFullName of libraries) {
    const [owner, repo] = repoFullName.split("/");
    let prsFromThisRepo = 0;
    let failed = false;

    try {
      const prs = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "all",
        sort: "created",
        direction: "desc",
        per_page: 50,
      });

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
          console.error(
            `Error fetching user profile:`,
            (error as Error).message,
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_GITHUB_CALLS),
        );
      }
    } catch (error) {
      console.error(
        `Error fetching PRs for ${repoFullName}:`,
        (error as Error).message,
      );
      failed = true;
    }

    repoStatus.set(repoFullName, { count: prsFromThisRepo, failed });
  }

  return { users, repoStatus };
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

  if (!process.env.PR_HASH_SECRET) {
    throw new Error("PR_HASH_SECRET environment variable is not set");
  }

  const octokit = new Octokit({ auth: token });
  const scanResults = dryRun ? [] : loadScanResults();
  const verifiedAutomations = loadVerifiedAutomations();
  const now = new Date().toISOString();

  const { users, repoStatus } = await searchUsers(octokit, prsPerRepo);

  if (users.length === 0) {
    console.error("No users found to scan");
    process.exit(1);
  }

  const repoFailures: string[] = [];
  for (const [repo, status] of repoStatus) {
    if (status.failed) {
      repoFailures.push(`  ${repo}: failed to fetch PRs`);
    } else if (status.count < prsPerRepo) {
      repoFailures.push(
        `  ${repo}: only ${status.count}/${prsPerRepo} PRs collected`,
      );
    }
  }

  if (repoFailures.length > 0) {
    console.error(
      `\nScan incomplete — the following repos did not meet the target:`,
    );
    for (const msg of repoFailures) console.error(msg);
    process.exit(1);
  }

  let completedCount = 0;
  const repoScores: Map<string, number> = new Map();

  for (const user of users) {
    console.log(
      `Scanning (${completedCount + 1}/${users.length}) [${user.repo_name}]`,
    );
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
