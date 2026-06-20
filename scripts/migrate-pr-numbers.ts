/// <reference types="node" />

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashPrId } from "./pr-hash";

const filePath = join(process.cwd(), "data", "scan-results.json");
const data: Array<Record<string, unknown>> = JSON.parse(
  readFileSync(filePath, "utf-8"),
);

const migrated = data.map((item) => ({
  ...item,
  pr_key: hashPrId(String(item.repo_name), Number(item.pr_key)),
}));

writeFileSync(filePath, JSON.stringify(migrated, null, 2));
console.log(`Migrated ${migrated.length} records`);
