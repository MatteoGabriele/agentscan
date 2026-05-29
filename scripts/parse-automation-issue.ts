/// <reference types="node" />
/**
 * Parse automation report issues and generate JSON entries
 * Usage: npx tsx scripts/parse-automation-issue.ts <issue-number>
 *        npx tsx scripts/parse-automation-issue.ts <issue-body> [issue-url] (legacy mode)
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { parseIssue } from "@github/issue-parser";
import { Octokit } from "octokit";

interface AutomationEntry {
  username: string;
  id: number;
  reason: string;
  issueUrl: string;
  createdAt: string;
}

export type { AutomationEntry };

export function parseIssueBody(body: string): Partial<AutomationEntry> {
  // Parse GitHub form template format using @github/issue-parser
  const parsed = parseIssue(body);

  // Extract fields from the parsed form
  const username = parsed["GitHub Username"]?.toString().trim();
  const idStr = parsed["GitHub User ID"]?.toString().trim();
  const id = idStr ? parseInt(idStr, 10) : undefined;
  const reasonRaw = parsed["Why do you believe this is an automated account?"]
    ?.toString()
    .trim();

  // Clean up reason - take first paragraph and normalize whitespace
  let reason = reasonRaw;
  if (reason) {
    // Split by double newline and take first paragraph
    reason = reason.split(/\n\s*\n/)[0].trim();
    // Clean up any remaining special characters or excessive whitespace
    reason = reason.replace(/\s+/g, " ");
  }

  return {
    username,
    id,
    reason,
  };
}

export function validateEntry(
  entry: Partial<AutomationEntry>,
): entry is AutomationEntry {
  if (!entry.username || typeof entry.username !== "string") {
    console.error("✗ Missing or invalid username");
    return false;
  }
  if (!entry.id || typeof entry.id !== "number") {
    console.error("✗ Missing or invalid GitHub user ID");
    return false;
  }
  if (!entry.reason || typeof entry.reason !== "string") {
    console.error("✗ Missing or invalid reason");
    return false;
  }
  if (!entry.issueUrl || typeof entry.issueUrl !== "string") {
    console.error("✗ Missing issue URL");
    return false;
  }
  return true;
}

export function generateEntry(
  parsed: Partial<AutomationEntry>,
  issueUrl: string,
  createdAt?: string,
): AutomationEntry {
  return {
    username: parsed.username!,
    id: parsed.id!,
    reason: parsed.reason!,
    issueUrl,
    createdAt: createdAt || new Date().toISOString().split("T")[0],
  };
}

function addEntryToJson(entry: AutomationEntry): void {
  const jsonPath = path.join(
    process.cwd(),
    "data/verified-automations-list.json",
  );

  if (!fs.existsSync(jsonPath)) {
    console.error("✗ JSON file not found:", jsonPath);
    process.exit(1);
  }

  const data = JSON.parse(
    fs.readFileSync(jsonPath, "utf-8"),
  ) as AutomationEntry[];

  // Check if username already exists
  if (data.some((item) => item.username === entry.username)) {
    console.error(`✗ Username "${entry.username}" already exists in the list`);
    process.exit(1);
  }

  data.push(entry);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n");
  console.log(`✓ Added "${entry.username}" to verified-automations-list.json`);
}

async function fetchIssueFromGitHub(
  issueNumber: number,
): Promise<{ body: string; issueUrl: string; createdAt: string }> {
  const octokit = new Octokit();

  try {
    const { data: issue } = await octokit.rest.issues.get({
      owner: "MatteoGabriele",
      repo: "agentscan",
      issue_number: issueNumber,
    });

    return {
      body: issue.body || "",
      issueUrl: issue.html_url,
      createdAt:
        issue.created_at?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error(`✗ Failed to fetch issue #${issueNumber}:`, error.message);
    } else {
      console.error(`✗ Failed to fetch issue #${issueNumber}`);
    }
    process.exit(1);
  }
}

function isIssueNumber(arg: string): boolean {
  return /^\d+$/.test(arg);
}

async function main() {
  const firstArg = process.argv[2];
  const secondArg = process.argv[3];
  const thirdArg = process.argv[4];

  if (!firstArg) {
    console.error(
      "Usage: npx tsx scripts/parse-automation-issue.ts <issue-number>",
    );
    console.error(
      "  or: npx tsx scripts/parse-automation-issue.ts <issue-body> [issue-url] [created-at] (legacy)",
    );
    process.exit(1);
  }

  console.log("🔍 Parsing automation report...\n");

  let issueBody: string;
  let issueUrl: string;
  let createdAt: string;

  // Check if first argument is an issue number
  if (isIssueNumber(firstArg)) {
    const issueNumber = parseInt(firstArg, 10);
    console.log(`📥 Fetching issue #${issueNumber} from GitHub...\n`);
    const {
      body,
      issueUrl: fetchedUrl,
      createdAt: fetchedDate,
    } = await fetchIssueFromGitHub(issueNumber);
    issueBody = body;
    issueUrl = fetchedUrl;
    createdAt = fetchedDate;
  } else {
    // Legacy mode: issue body passed directly
    issueBody = firstArg;
    issueUrl = secondArg || "";
    createdAt = thirdArg || new Date().toISOString().split("T")[0];
  }

  const parsed = parseIssueBody(issueBody);

  // Debug output
  console.log("DEBUG - Parsed values:");
  console.log(`  username: "${parsed.username}"`);
  console.log(`  id: ${parsed.id}`);
  console.log(`  reason: "${parsed.reason?.substring(0, 60)}..."`);
  console.log("");

  const entry = generateEntry(parsed, issueUrl || "", createdAt);

  if (!validateEntry(entry)) {
    process.exit(1);
  }

  console.log("✓ Parsed successfully:");
  console.log(`  Username: ${entry.username}`);
  console.log(`  ID: ${entry.id}`);
  console.log(`  Reason: ${entry.reason.substring(0, 50)}...`);
  console.log(`  Issue: ${entry.issueUrl}`);
  console.log(`  Created: ${entry.createdAt}`);

  addEntryToJson(entry);
}

// Only run main if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
