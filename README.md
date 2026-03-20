# AgentScan

An open experiment in detecting automation patterns on GitHub.

## Why this?

I didn't expect to build this website, but ended up creating it after reading multiple articles and seeing open source maintainers struggling with AI agents targeting their projects.

- https://socket.dev/blog/ai-agent-lands-prs-in-major-oss-projects-targets-maintainers-via-cold-outreach
- https://tylur.blog/harmful-prs/
- https://theshamblog.com/an-ai-agent-published-a-hit-piece-on-me/

AgentScan uses an opinionated scoring system to analyze public GitHub events and classify accounts based on their latest activity. The results are indicators, not verdicts. There's no AI involved — just event analysis looking for patterns that feel automated.

The scoring is not bulletproof. Sophisticated automated accounts can pass undetected, and legitimate developers can occasionally trigger false positives. That's why AgentScan also maintains a curated list of manually verified accounts — submitted by the community, reviewed by maintainers, and merged via pull request. No account is added without human verification.

**This is an ongoing experiment.** Scores may be inaccurate. Use them as a starting point, not a conclusion.

## Reporting an automated account

If you've found a GitHub account you believe is automated, you can submit it for review.

1. [Open an issue](https://github.com/you/agentscan/issues/new?template=report-automated-account.md) using the report template
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
