import { Octokit } from "octokit";
import type { Scan } from "~~/shared/types/scan";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const session = await getUserSession(event);
  const token = session?.githubToken || config.githubToken;

  const octokit = new Octokit({ auth: token });

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
