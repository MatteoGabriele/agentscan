import { Octokit } from "octokit";
import {
  DetectedAutomation,
  type DetectedAutomationResponse,
} from "~~/shared/types/automation";
import { identityConfig } from "@unveil/identity";
import { cicdBots } from "~~/shared/daily-scan";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const octokit = new Octokit({ auth: config.githubToken });

  try {
    const { data: scanResults } = await octokit.rest.repos.getContent({
      owner: "matteogabriele",
      repo: "agentscan",
      path: "data/scan-results.json",
    });

    if ("content" in scanResults) {
      const content = Buffer.from(scanResults.content, "base64").toString(
        "utf-8",
      );
      const scanned = JSON.parse(content) as DetectedAutomationResponse[];
      return scanned.reduce<DetectedAutomation[]>((coll, item) => {
        if (
          !item.username ||
          cicdBots.includes(item.username) ||
          item.score >= identityConfig.THRESHOLD_SUSPICIOUS
        ) {
          return coll;
        }

        const automation = coll.find(
          (collItem) => collItem.userId === item.user_id,
        );

        if (automation) {
          automation.totalPrs++;
          automation.lastDetected = item.created_at;
        } else {
          coll.push({
            username: item.username,
            userId: item.user_id,
            totalPrs: 1,
            score: item.score,
            firstDetected: item.created_at,
          });
        }

        return coll;
      }, []);
    }

    return [];
  } catch {
    throw createError({
      statusCode: 500,
      message: "Failed to fetch verified automations list",
    });
  }
});
