import { readFileSync, writeFileSync } from "fs";

const path = new URL("../data/scan-results.json", import.meta.url).pathname;
const data = JSON.parse(readFileSync(path, "utf-8"));

const stripped = data.map(({ user_id, username, ...rest }) => rest);

writeFileSync(path, JSON.stringify(stripped, null, 2));
console.log(`Stripped ${data.length} entries.`);
