name: Report Automated Account
description: Help identify and report automated GitHub accounts
title: "[AUTOMATION] "
labels: ["automation"]
body:

- type: markdown
  attributes:
  value: |
  Thank you for helping identify automated accounts on GitHub. Please fill in the details below.

- type: input
  id: username
  attributes:
  label: GitHub Username
  description: "The username of the account you want to report (e.g., kaigritun)"
  placeholder: "username"
  validations:
  required: true

- type: input
  id: user-id
  attributes:
  label: GitHub User ID
  description: "The numeric user ID. Find it at https://api.github.com/users/USERNAME (look for the 'id' field)"
  placeholder: "258667664"
  type: number
  validations:
  required: true

- type: textarea
  id: reason
  attributes:
  label: Why do you believe this is an automated account?
  description: |
  ⚠️ **This will be displayed publicly on the website** - Keep it concise and factual.

      **Good examples:**
      - "Self-disclosed as an AI agent"
      - "Account publicly describes itself as an AI agent in Bluesky message"
      - "Heavy automation usage creating spam PRs within short timeframe"

      **Not recommended:**
      - Long narratives or detailed stories
      - Personal opinions or speculation

  placeholder: "Brief, factual reason visible to the public..."
  validations:
  required: true

- type: textarea
  id: evidence
  attributes:
  label: Supporting Evidence
  description: "Links to PRs, issues, screenshots, or specific examples that support your claim"
  placeholder: | - Link to PR: https://... - Pattern observed: ... - Additional context: ...
  validations:
  required: false

- type: textarea
  id: additional-context
  attributes:
  label: Additional Context
  description: "Any other relevant information for reviewers"
  placeholder: "Optional additional details..."
  validations:
  required: false

- type: checkboxes
  id: acknowledgment
  attributes:
  label: Acknowledgment
  description: "Please confirm:"
  options: - label: "I believe this report is accurate and in good faith"
  required: true - label: "I understand this may be reviewed by maintainers before approval"
  required: true
