import * as core from "@actions/core";
import * as github from "@actions/github";
import { identifyReplicant } from "../../../shared/utils/voight-kampff-test/identify-replicant";
import type {
  IdentifyReplicantResult,
  IdentityClassification,
} from "../../../shared/types/identity";
import { getClassificationDetails } from "../../../shared/utils/voight-kampff-test/classification-details";

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });
    const octokit = github.getOctokit(token);

    const context = github.context;
    const username = "kaigritun"; //context.actor;
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

    const indicator = statusIndicators[analysis.classification];
    const details = getClassificationDetails(analysis.classification);

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: `### ${indicator} ${details.label}

${details.description}

[View full analysis →](https://agentscan.netlify.app/user/${username})

<sub>This is an automated analysis by [AgentScan](https://agentscan.netlify.app)</sub>`,
    });

    // Add labels based on classification
    if (analysis.classification !== "organic") {
      const labelMap: Record<
        Exclude<IdentityClassification, "organic">,
        string
      > = {
        mixed: "agentscan:mixed-signals",
        automation: "agentscan:automation-signals",
      };

      const label = labelMap[analysis.classification];
      if (label) {
        await octokit.rest.issues.addLabels({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: prNumber,
          labels: [label],
        });
      }
    }
    core.info(`Comment posted on PR #${prNumber}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
