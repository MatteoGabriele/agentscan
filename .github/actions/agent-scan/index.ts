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
    const username = context.actor;
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

    // const status: Record<IdentityClassification, string> = {
    //   organic:
    //     '<span style="display: inline-block; width: 12px; height: 12px; background-color: #10b981; border-radius: 50%; margin-right: 8px;"></span>',
    //   mixed:
    //     '<span style="display: inline-block; width: 12px; height: 12px; background-color: #f59e0b; border-radius: 50%; margin-right: 8px;"></span>',
    //   automation:
    //     '<span style="display: inline-block; width: 12px; height: 12px; background-color: #ef4444; border-radius: 50%; margin-right: 8px;"></span>',
    // };

    const statusColorMap: Record<IdentityClassification, string> = {
      organic: "#10b981",
      mixed: "#f59e0b",
      automation: "#ef4444",
    };
    const statusColor = statusColorMap[analysis.classification];
    const indicator = `
      <span style="display: inline-block; width: 12px; height: 12px; background-color: ${statusColor}; border-radius: 50%; margin-right: 8px;" />
    `;
    const details = getClassificationDetails(analysis.classification);

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: `### ${indicator}${details.label}

${details.description}

[View full analysis →](https://agentscan.netlify.app/user/${username})

<sub>Powered by [AgentScan](https://agentscan.netlify.app)</sub>`,
    });

    core.info(`Comment posted on PR #${prNumber}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
