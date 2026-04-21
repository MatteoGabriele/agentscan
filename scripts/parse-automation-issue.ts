/**
 * Parse automation report issues and generate JSON entries
 * Usage: npx tsx scripts/parse-automation-issue.ts <issue-body> [issue-url]
 */

import fs from "fs";
import path from "path";

interface AutomationEntry {
  username: string;
  id: number;
  reason: string;
  issueUrl: string;
  createdAt: string;
}

function parseIssueBody(body: string): Partial<AutomationEntry> {
  // Parse GitHub form template format
  // Form fields are presented as "### Field Name\n\nValue"

  // Extract GitHub Username
  const usernameMatch = body.match(/### GitHub Username\s*\n+\s*(.+?)(?:\n|$)/);
  const username = usernameMatch?.[1]?.trim();

  // Extract GitHub User ID
  const idMatch = body.match(/### GitHub User ID\s*\n+\s*(\d+)/);
  const id = idMatch ? parseInt(idMatch[1], 10) : undefined;

  // Extract Reason - stop at the next ### or end of string
  const reasonMatch = body.match(
    /### Why do you believe this is an automated account\?\s*\n+\s*([\s\S]*?)(?:\n+### |\n+_No|$)/,
  );
  const reason = reasonMatch?.[1]?.trim().split("\n\n")[0];

  return {
    username,
    id,
    reason,
  };
}

function validateEntry(
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
  if (entry.reason.length > 200) {
    console.error(
      `✗ Reason is too long (${entry.reason.length} chars, max 200). Please be more concise.`,
    );
    return false;
  }
  if (!entry.issueUrl || typeof entry.issueUrl !== "string") {
    console.error("✗ Missing issue URL");
    return false;
  }
  return true;
}

function generateEntry(
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

async function main() {
  const issueBody = process.argv[2];
  const issueUrl = process.argv[3];
  const createdAt = process.argv[4];

  if (!issueBody) {
    console.error(
      "Usage: npx tsx scripts/parse-automation-issue.ts <issue-body> [issue-url] [created-at]",
    );
    process.exit(1);
  }

  console.log("🔍 Parsing automation report...\n");

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

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
