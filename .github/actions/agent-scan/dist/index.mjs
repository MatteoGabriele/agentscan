import * as core from "@actions/core";
import * as github from "@actions/github";
//#region index.ts
async function run() {
	try {
		const token = core.getInput("github-token", { required: true });
		const octokit = github.getOctokit(token);
		const username = github.context.actor;
		const { data: user } = await octokit.rest.users.getByUsername({ username });
		const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
			username,
			per_page: 100,
			page: 1
		});
		core.info(`PR opened by: ${user.name}`);
		core.info(`Events count: ${events.length}`);
	} catch (error) {
		if (error instanceof Error) core.setFailed(error.message);
	}
}
run();
//#endregion
export {};
