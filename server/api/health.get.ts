import { Octokit } from "octokit";
import type { EcosystemHealthItem } from "~~/shared/types/ecosystem-health";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const token = config.githubToken;

  // Prevent API calls without a valid token to avoid hitting rate limits
  if (!token) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized: GitHub token not available",
    });
  }

  const octokit = new Octokit({ auth: token });

  try {
    const { data: scanList } = await octokit.rest.repos.getContent({
      owner: "matteogabriele",
      repo: "agentscan",
      path: "data/scan-results.json",
    });

    if ("content" in scanList) {
      const content = Buffer.from(scanList.content, "base64").toString("utf-8");
      const scanData = JSON.parse(content) as EcosystemHealthItem[];

      return scanData;
    }

    return [];
  } catch {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verified automations list",
    });
  }
});
