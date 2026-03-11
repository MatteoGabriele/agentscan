import * as core from "@actions/core";
import * as github from "@actions/github";
import { identifyReplicant } from "../../../shared/utils/voight-kampff-test/identify-replicant";
import type {
  IdentifyReplicantResult,
  IdentityClassification,
} from "../../../shared/types/identity";
import { getClassificationDetails } from "../../../shared/utils/voight-kampff-test/classification-details";
import type { VerifiedAutomation } from "../../..//shared/types/automation";

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });
    const octokit = github.getOctokit(token);

    const context = github.context;
    const username = "niveshdandyan"; //context.actor;
    const prNumber = context.payload.pull_request?.number;

    if (!prNumber) {
      throw new Error("No PR number found");
    }

    const { data: user } = await octokit.rest.users.getByUsername({
      username: username,
    });

    const { data: events } =
      await octokit.rest.activity.listPublicEventsForUser({
        username,
        per_page: 100,
        page: 1,
      });

    const { data: verifiedList } = await octokit.rest.repos.getContent({
      owner: "matteogabriele",
      repo: "agentscan",
      path: "data/verified-automations-list.json",
    });

    const verified: VerifiedAutomation[] = [];

    if ("content" in verifiedList) {
      const content = Buffer.from(verifiedList.content, "base64").toString(
        "utf-8",
      );

      verified.push(...JSON.parse(content));
    }

    const verifiedAutomation: VerifiedAutomation | undefined = verified.find(
      (account) => account.username === username,
    );

    const hasCommunityFlag: boolean = !!verifiedAutomation;

    const analysis: IdentifyReplicantResult = identifyReplicant({
      accountName: username,
      reposCount: user.public_repos,
      createdAt: user.created_at,
      events,
    });

    const statusIndicators: Record<IdentityClassification, string> = {
      organic: "✅",
      mixed: "⚠️",
      automation: "❌",
    };

    const indicator = hasCommunityFlag
      ? statusIndicators["automation"]
      : statusIndicators[analysis.classification];
    const details = hasCommunityFlag
      ? {
          label: "Flagged by community",
          description:
            "This account has been flagged as potentially automated by the community.",
        }
      : getClassificationDetails(analysis.classification);

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: `### ${indicator} ${hasCommunityFlag ? "Flagged by community" : details.label}

${details.description}

[View full analysis →](https://agentscan.netlify.app/user/${username})

<sub>This is an automated analysis by [AgentScan](https://agentscan.netlify.app)</sub>`,
    });

    // Add labels based on classification or community flag
    const labelsToAdd: string[] = [];

    if (hasCommunityFlag) {
      labelsToAdd.push("agentscan:community-flagged");
    } else if (analysis.classification !== "organic") {
      const labelMap: Record<
        Exclude<IdentityClassification, "organic">,
        string
      > = {
        mixed: "agentscan:mixed-signals",
        automation: "agentscan:automated-account",
      };

      const label = labelMap[analysis.classification];
      if (label) {
        labelsToAdd.push(label);
      }
    }

    if (labelsToAdd.length > 0) {
      await octokit.rest.issues.addLabels({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: prNumber,
        labels: labelsToAdd,
      });
    }
    core.info(`Comment posted on PR #${prNumber}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
