import { Octokit } from "octokit";
import type { VerifiedAutomation } from "~~/shared/types/automation";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    const { data: verifiedList } = await octokit.rest.repos.getContent({
      owner: "matteogabriele",
      repo: "agentscan",
      path: "data/verified-automations-list.json",
    });

    if ("content" in verifiedList) {
      const content = Buffer.from(verifiedList.content, "base64").toString(
        "utf-8",
      );
      const verified = JSON.parse(content) as VerifiedAutomation[];
      return verified;
    }

    return [];
  } catch {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verified automations list",
    });
  }
});
