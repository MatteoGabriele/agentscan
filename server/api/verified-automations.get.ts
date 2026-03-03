import { Octokit } from "octokit";

type VerifiedAutomation = {
  username: string;
  reason: string;
  issueUrl: string;
  createdAt: string;
};

type VerifiedAutomationsList = VerifiedAutomation[];

export default defineCachedEventHandler(
  async () => {
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
        const verified = JSON.parse(content) as VerifiedAutomationsList;
        return verified;
      }

      return [] satisfies VerifiedAutomationsList;
    } catch (err: unknown) {
      console.error("verified-automations raw error:", err);

      throw createError({
        statusCode: 500,
        message: "Failed to fetch verified automations list",
      });
    }
  },
  {
    maxAge: process.env.NODE_ENV === "development" ? 0 : 3600, // 0 = no cache, 3600 = 1 hour
  },
);
