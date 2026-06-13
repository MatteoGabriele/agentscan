/// <reference types="node" />
import { readFileSync } from "node:fs";
import { getHealthStats } from "../shared/utils/health-stats";
import { getClosedPrPercentageTotal } from "../shared/utils/charts";

async function main() {
  const results = JSON.parse(readFileSync("data/scan-results.json", "utf-8"));

  if (!results?.length) {
    console.log("No data returned from API");
    return;
  }

  const stats = getHealthStats(results);

  if (!stats) {
    console.log("No stats");
    return;
  }

  const value = getClosedPrPercentageTotal(results, [0, 50]);
  const percentage = value === null ? "N/A" : `${value}%`;

  const payload = {
    embeds: [
      {
        title: "GitHub Ecosystem Health",
        url: "https://agentscan.tools",
        color: 5763719, // green
        fields: [
          {
            name: "🟢 Organic",
            value: `${stats.organic.percentage}%`,
            inline: true,
          },
          {
            name: "🟡 Mixed",
            value: `${stats.mixed.percentage}%`,
            inline: true,
          },
          {
            name: "🔴 Automation",
            value: `${stats.automation.percentage}%`,
            inline: true,
          },
          {
            name: "⚫ Automation PR closure rate",
            value: percentage,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "agentscan.tools" },
      },
    ],
  };

  const webhook = process.env.DISCORD_WEBHOOK;

  if (!webhook) {
    console.log("Discord webhook URL not found!");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const discordRes = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!discordRes.ok) {
    console.error("Discord webhook failed:", discordRes.status);
    process.exit(1);
  }

  console.log("Discord notification sent");
}

// Only run main if this script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
