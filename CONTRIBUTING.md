# Contributing to AgentScan

Thanks for your interest in contributing. This is an open experiment and contributions of all kinds are welcome — bug fixes, new signals, copy improvements, or just opening an issue with an idea.

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

**4. Start the dev server**

```bash
pnpm dev
```

## Project structure

```
server/
  api/           # Nitro server API routes
  utils/         # Shared server utilities
pages/           # Nuxt pages
components/      # Vue components
data/
  verified-automated.json  # Curated list of verified automated accounts
```

## Making changes

### Scoring algorithm

The scoring logic lives in `shared/utils/voight-kampff-test` folder. Each signal has a label, a point value, and a detail string. If you want to add a new signal, follow the existing pattern and open a PR with your reasoning — explain what the signal detects and why it's indicative of automation.

### Styles

AgentScan uses UnoCSS with the default preset. Stick to utility classes directly in the template. Avoid adding custom CSS unless strictly necessary.

### Verified accounts list

To add a verified automated account to the curated list, follow the process in the README — open an issue first, don't submit a PR directly without a linked issue.

## Before submitting a PR

- Keep PRs focused — one thing per PR
- Link to the relevant issue if there is one

## Questions

Open an issue or start a discussion on the GitHub repo.
