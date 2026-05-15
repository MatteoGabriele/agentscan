import { Octokit } from "octokit";
import dayjs from "dayjs";
import type { IntegrationItem } from "~~/shared/types/integrations";

export type IntegrationUsafeLab = {
  username: string;
  total_prs: number;
  first_pr: string;
  last_pr: string;
};

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: "UnsafeLabs",
      repo: "Bounty-Hunters",
      path: "clankers.json",
    });

    if ("content" in data) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const integrationData = JSON.parse(content) as IntegrationUsafeLab[];
      return integrationData.map((d) => ({
        label: "UnsafeLabs Bounty Hunters",
        username: d.username,
        createdAt: d.first_pr,
        reason: `This account appears in the UnsafeLabs bounty hunters database. Submitted a total of ${d.total_prs} PR${d.total_prs === 1 ? "" : "s"} to the project. Activity detected from ${dayjs(d.first_pr).format("MMM D, YYYY")} through ${dayjs(d.last_pr).format("MMM D, YYYY")}.`,
        link: `https://github.com/UnsafeLabs/Bounty-Hunters/pulls?q=is%3Apr+author%3A${d.username}`,
      })) satisfies IntegrationItem[];
    }

    return [];
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch integration list",
      cause: error,
    });
  }
});
