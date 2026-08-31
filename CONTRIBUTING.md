# Contributing to AgentScan

Thanks for your interest in contributing. This is an open experiment and contributions of all kinds are welcome: bug fixes, new signals, copy improvements, or just opening an issue with an idea.

## Local development

### Prerequisites

- Node.js 24+

### Setup

**1. Clone the repo**

```bash
git clone https://github.com/MatteoGabriele/agentscan.git
cd agentscan
```

**2. Install dependencies**

```bash
pnpm install
```

**3. Create a `.env` file**
A GitHub token is optional for local development. Without one the app still works but is limited to 60 API requests per hour, which is plenty for development. If you need a higher limit, add your own generic GitHub token in the .env file:

```env
GITHUB_TOKEN=your_github_personal_access_token
```

The Ecosystem Activity pages read their data from
[agentscan-logs](https://github.com/MatteoGabriele/agentscan-logs), which runs
the hourly scan. `pnpm dev` talks to the deployed one, so there is nothing to
set up. Point it somewhere else, a local checkout of that repo for instance,
with:

```env
NUXT_LOGS_API_BASE=http://127.0.0.1:3000
```

**4. Start the dev server**

```bash
pnpm dev
```

## Project structure

```
app/
  pages/         # Nuxt pages
  components/    # Vue components
  composables/   # Vue composables
server/
  api/           # Nitro server API routes
  utils/         # Shared server utilities
shared/          # Code shared between the app and the server
data/
  verified-automations-list.json  # Curated list of verified automated accounts
```

The hourly GitHub scan, the data it writes and the endpoints that serve it live
in [agentscan-logs](https://github.com/MatteoGabriele/agentscan-logs). The
routes under `server/api/health/` and `server/api/automation-tally` here are
pass-throughs to that service.

## Making changes

### Scoring algorithm

The scoring logic does not live in this repository. It is published as
[@unveil/identity](https://github.com/unveil-project/identity) and consumed here
as a dependency.

New signals, better thresholds and detection fixes belong in that repository.
Open a PR there with your reasoning: what the signal detects, and why it is
indicative of automation. The changes reach AgentScan once the package version
is bumped here.

### Styles

AgentScan uses UnoCSS with the default preset. Stick to utility classes directly in the template. Avoid adding custom CSS unless strictly necessary.

### Verified accounts list

To add a verified automated account to the curated list, you need to first go to the account you want to flag on AgentScan itself and press the "report" link. Do not open an issue from the repository itself because you will miss a lot of key insights and evidence about the account.

Submissions are reviewed before they land. Reviewers vote on the issue with a 👍
or a 👎 reaction, and a workflow checks those votes every hour. With enough
approvals the account is added to `data/verified-automations-list.json` and the
issue is closed as confirmed; with enough rejections it is closed as rejected.
Until the vote settles, the issue stays open and nothing changes on the site.

## Questions

Open an issue or start a discussion on the GitHub repo.
