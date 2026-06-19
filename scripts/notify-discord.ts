/// <reference types="node" />
import { readFileSync } from "node:fs";
import { getHealthStats, formatTrend } from "../shared/utils/health-stats";
import { getClosedPrPercentageTotal } from "../shared/utils/charts";
import { calcLinearProgression } from "../shared/utils/calc-linear-progression";
import { countClassificationByDate } from "../shared/utils/count-classification-by-date";

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

  const automation: number[] = [];
  const mixed: number[] = [];
  const organic: number[] = [];

  const countsByDate = countClassificationByDate(results);
  const dates = Object.keys(countsByDate).sort();

  dates.forEach((date) => {
    const counts = countsByDate[date];
    if (!counts) return;
    automation.push(counts.automation.count);
    mixed.push(counts.mixed.count);
    organic.push(counts.organic.count);
  });

  const categoryProgression = {
    automation: calcLinearProgression(automation),
    mixed: calcLinearProgression(mixed),
    organic: calcLinearProgression(organic),
  };

  function trendLabel(trendValue: number): string {
    const arrow = trendValue > 0 ? "↑" : trendValue < 0 ? "↓" : "→";
    return `${arrow} ${formatTrend(trendValue)}`;
  }

  const payload = {
    content: [
      "Daily Dose of Clankers",
      "",
      `🟢 Organic ${stats.organic.percentage}% ${trendLabel(categoryProgression.organic.trend)}`,
      `🟡 Mixed ${stats.mixed.percentage}% ${trendLabel(categoryProgression.mixed.trend)}`,
      `🔴 Automation ${stats.automation.percentage}% ${trendLabel(categoryProgression.automation.trend)}`,
      "",
      `⚫ Automation PR closure rate ${percentage}`,
    ].join("\n"),
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
