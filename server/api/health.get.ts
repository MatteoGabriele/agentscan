import { Octokit } from "octokit";
import type {
  EcosystemHealthItem,
  EcosystemHealthCategoryProgression,
} from "~~/shared/types/ecosystem-health";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: "matteogabriele",
      repo: "agentscan",
      path: "data/scan-results.json",
    });

    let results: EcosystemHealthItem[] = [];

    if ("content" in data) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      results = JSON.parse(content);
    }

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

      counts.automation.trend = calcLinearProgression(automation).trend;
      counts.mixed.trend = calcLinearProgression(mixed).trend;
      counts.organic.trend = calcLinearProgression(organic).trend;
    });

    const categoryProgression: EcosystemHealthCategoryProgression = {
      automation: calcLinearProgression(automation),
      mixed: calcLinearProgression(mixed),
      organic: calcLinearProgression(organic),
    };

    return {
      results,
      categoryProgression,
      countsByDate,
      dates,
    };
  } catch {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verified automations list",
    });
  }
});
