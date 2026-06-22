import { Octokit } from "octokit";
import type {
  EcosystemHealthItem,
  EcosystemHealthCategoryProgression,
} from "~~/shared/types/ecosystem-health";
import { getClassificationStatsByDate } from "~~/shared/utils/count-classification-by-date";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    // Step 1: Get the file metadata (sha) without content
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: "matteogabriele",
      repo: "agentscan",
      path: "data/scan-results.json",
    });

    if (!("sha" in fileData)) {
      throw new Error("Unexpected response: not a file");
    }

    // Step 2: Fetch the full blob using the sha — no size limit
    const { data: blobData } = await octokit.rest.git.getBlob({
      owner: "matteogabriele",
      repo: "agentscan",
      file_sha: fileData.sha,
    });

    const content = Buffer.from(blobData.content, "base64").toString("utf-8");
    const results: EcosystemHealthItem[] = JSON.parse(content);

    const automationPercentages: number[] = [];
    const mixedPercentages: number[] = [];
    const organicPercentages: number[] = [];

    const countsByDate = getClassificationStatsByDate(results);
    const dates = Object.keys(countsByDate).sort();

    dates.forEach((date) => {
      const counts = countsByDate[date];
      if (!counts) return;

      automationPercentages.push(counts.automation.percentage);
      mixedPercentages.push(counts.mixed.percentage);
      organicPercentages.push(counts.organic.percentage);

      counts.automation.trend = calcLinearProgression(
        automationPercentages,
      ).trend;
      counts.mixed.trend = calcLinearProgression(mixedPercentages).trend;
      counts.organic.trend = calcLinearProgression(organicPercentages).trend;
    });

    const categoryProgression: EcosystemHealthCategoryProgression = {
      automation: calcLinearProgression(automationPercentages),
      mixed: calcLinearProgression(mixedPercentages),
      organic: calcLinearProgression(organicPercentages),
    };

    return {
      results,
      categoryProgression,
      countsByDate,
      dates,
    };
  } catch (error) {
    console.error("Ecosystem health fetch error:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verified automations list",
    });
  }
});
