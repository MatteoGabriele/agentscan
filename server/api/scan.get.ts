import { Octokit } from "octokit";
import type { Scan } from "~~/shared/types/scan";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    const { data: scanList } = await octokit.rest.repos.getContent({
      owner: "matteogabriele",
      repo: "agentscan",
      path: "data/scan-results.json",
    });

    if ("content" in scanList) {
      const content = Buffer.from(scanList.content, "base64").toString("utf-8");
      const scanData = JSON.parse(content) as Scan[];

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
