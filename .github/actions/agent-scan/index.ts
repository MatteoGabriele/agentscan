import * as core from "@actions/core";
import * as github from "@actions/github";
import { identifyReplicant } from "../../../shared/utils/voight-kampff-test/identify-replicant";

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

    const analysis = identifyReplicant({
      accountName: username,
      reposCount: user.public_repos,
      createdAt: user.created_at,
      events,
    });

    const status =
      analysis.classification === "organic"
        ? "✅ Organic activity"
        : "⚠️ Automation signals detected";

    await octokit.rest.issues.createComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: prNumber,
      body: `## AgentScan Analysis

**User**: @${username}
**Profile**: ${user.name || "N/A"}
**Account created**: ${new Date(user.created_at).toLocaleDateString()}
**Public repos**: ${user.public_repos}

---

### ${status}

${
  analysis.classification === "organic"
    ? `No automation signals detected in the analyzed events.`
    : `**Potential automation signals:**\n${analysis.signals.map((s: string) => `- ${s}`).join("\n")}`
}

*Analyzed from the last ${events.length} public GitHub events*

---

<sub>This is an automated analysis by AgentScan</sub>`,
    });

    core.info(`Comment posted on PR #${prNumber}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
