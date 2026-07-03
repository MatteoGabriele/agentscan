# AgentScan

An open experiment in detecting automation patterns on GitHub.

AgentScan analyzes a GitHub account's public activity and scores it based on how much it appears to rely on automation. There's no AI involved, just event analysis, powered by [identity](https://github.com/unveil-project/identity). The results are indicators, not verdicts: a starting point for your own judgment, not a final answer.

Scores aren't bulletproof. Sophisticated automated accounts can slip through, and legitimate developers can occasionally trigger false positives. To help with that, AgentScan also maintains a curated list of manually verified accounts, submitted by the community and reviewed by maintainers before being merged in.

## Use it in your own repository

The same analysis that powers the website can run directly against your repository, so you can catch automated activity on your own pull requests. You can keep it as light as just tagging PRs with the account's classification, or go further and have certain classifications auto-closed.

- **[GitHub App](https://github.com/apps/agentscanapp)** — zero config. Install it and it starts working immediately, no workflow files required. Both share almost the same configuration options, but the app is updated centrally, so you get fixes and new features as soon as they ship, no action needed on your end.
- **[GitHub Action](https://github.com/MatteoGabriele/agentscan-action)** — needs to be added to a workflow, and new releases have to be published and then manually picked up by pinning a newer version in your repository.

## Reporting an automated account

If you've found a GitHub account you believe is automated, you can submit it for review.

1. [Open an issue](https://github.com/MatteoGabriele/agentscan/issues/new?template=report-automated-account.yml) using the report template
2. Include the GitHub username, your reasoning, and any supporting evidence
3. A maintainer will review the account manually
4. If confirmed, the account will be added to the verified list via a pull request
5. The entry will appear in AgentScan with a link back to the original issue

Please only submit accounts you have reasonable evidence for. Submissions without supporting context will be closed.

## Disputing or removing a claim

If your account has been flagged and you believe it was done in error:

1. Find the issue linked on your AgentScan profile page
2. Open it and leave a comment explaining why the classification is incorrect
3. A maintainer will review your case and remove the entry if warranted

We take wrongful classifications seriously. The goal is accuracy, not accusation.

## Contributing

Contributions are welcome. If you find something that doesn't work or have an idea for something that works better, open an issue or a pull request.

For local development setup, see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Stack

- [Nuxt](https://nuxt.com)
- [UnoCSS](https://unocss.dev)
- [Netlify](https://netlify.com)
- [GitHub API](https://docs.github.com/en/rest)
- Love

## Why this?

I didn't expect to build this website, but ended up creating it after reading multiple articles and seeing open source maintainers struggling with AI agents targeting their projects.

- https://socket.dev/blog/ai-agent-lands-prs-in-major-oss-projects-targets-maintainers-via-cold-outreach
- https://tylur.blog/harmful-prs/
- https://theshamblog.com/an-ai-agent-published-a-hit-piece-on-me/

**This is an ongoing experiment.** Scores may be inaccurate. Use them as a starting point, not a conclusion.
