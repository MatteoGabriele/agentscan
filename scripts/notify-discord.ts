/// <reference types="node" />
import { readFileSync } from "node:fs";
import { formatTrend } from "../shared/utils/health-stats";
import {
  getClosedPrPercentageTotal,
  getClosedPrDelta,
} from "../shared/utils/charts";
import { calcLinearProgression } from "../shared/utils/calc-linear-progression";
import {
  getClassificationStatsByDate,
  getCategoryDeltas,
} from "../shared/utils/count-classification-by-date";
import { unpack } from "../shared/utils/compactor";
import { formatDateRange } from "../shared/utils/dates";

async function main() {
  const results = unpack(readFileSync("data/scan-results.txt", "utf-8"));

  if (!results?.length) {
    console.log("No data returned from API");
    return;
  }

  const closedAutomationPrPercentage = getClosedPrPercentageTotal(
    results,
    [0, 50],
  );
  const closedAutomationPrDelta = getClosedPrDelta(results, [0, 50]);

  const automation: number[] = [];
  const mixed: number[] = [];
  const organic: number[] = [];

  const countsByDate = getClassificationStatsByDate(results);
  const dates = Object.keys(countsByDate).sort();

  dates.forEach((date) => {
    const counts = countsByDate[date];
    if (!counts) return;
    automation.push(counts.automation.percentage);
    mixed.push(counts.mixed.percentage);
    organic.push(counts.organic.percentage);
  });

  const categoryProgression = {
    automation: calcLinearProgression(automation),
    mixed: calcLinearProgression(mixed),
    organic: calcLinearProgression(organic),
  };

  const categoryDeltas = getCategoryDeltas(results);

  function trendLabel(trendValue: number): string {
    const arrow = trendValue > 0 ? "↑" : trendValue < 0 ? "↓" : "→";
    return `${arrow} ${formatTrend(trendValue)}`;
  }

  function statLabel(value: number | null, suffix = ""): string {
    if (value == null || !isFinite(value)) return "N/A";
    const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
    const sign = value > 0 ? "+" : "";
    return `${arrow} ${sign}${value}${suffix}`;
  }

  function percentageLabel(value: number | null): string {
    return value === null ? "N/A" : `${value}%`;
  }

  const payload = {
    content: [
      "Daily Dose of Clankers",
      "",
      `${formatDateRange({ startDate: dates[0], endDate: dates.at(-1), startYear: true, endYear: true, locale: "en-GB" })}`,
      "",
      `🟢 Organic`,
      `   today: ${percentageLabel(categoryDeltas.organic.lastPercentage)}, ${statLabel(categoryDeltas.organic.percentagePointDifference, " pts")}`,
      `   overall trend: ${trendLabel(categoryProgression.organic.trend)}`,
      "",
      `🟡 Mixed`,
      `   today: ${percentageLabel(categoryDeltas.mixed.lastPercentage)}, ${statLabel(categoryDeltas.mixed.percentagePointDifference, " pts")}`,
      `   overall trend: ${trendLabel(categoryProgression.mixed.trend)}`,
      "",
      `🔴 Automation`,
      `   today: ${percentageLabel(categoryDeltas.automation.lastPercentage)}, ${statLabel(categoryDeltas.automation.percentagePointDifference, " pts")}`,
      `   overall trend: ${trendLabel(categoryProgression.automation.trend)}`,
      "",
      "",
      `⚫ Automation PR closure rate`,
      `   today: ${percentageLabel(closedAutomationPrDelta.lastSnapshot.percentage)}, ${statLabel(closedAutomationPrDelta.percentagePointDifference, " pts")}`,
      `   overall: ${percentageLabel(closedAutomationPrPercentage)}`,
      "",
    ].join("\n"),
  };

  const webhook = process.env.DISCORD_WEBHOOK;

  if (!webhook) {
    console.log("Discord webhook URL not found!");
    console.log(JSON.stringify(payload, null, 2));
    console.log(payload.content);
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
