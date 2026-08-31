<script setup lang="ts">
type ContributionLink = {
  label: string
  url: string
}

type Contribution = {
  title: string
  description: string
  icon: string
  links: ContributionLink[]
}

const contributions: Contribution[] = [
  {
    title: 'Report an automated account',
    description:
      'Found an account you believe is automated? Open an issue with the username, your reasoning and any supporting evidence. Reviewers then vote on it, and once enough of them approve, the account joins the verified list with a link back to the original issue.',
    icon: 'i-lucide:clipboard-pen',
    links: [
      {
        label: 'Open a report',
        url: 'https://github.com/MatteoGabriele/agentscan/issues/new?template=report-automated-account.yml',
      },
      {
        label: 'Community reports',
        url: '/automations',
      },
    ],
  },
  {
    title: 'Dispute a claim',
    description:
      'Listings come from people: someone reports an account and reviewers vote to add or reject it, so a call can be wrong. If your account was added in error, comment on the issue linked from your profile page and explain why. Entries are removed when the case warrants it.',
    icon: 'i-lucide:scale',
    links: [
      {
        label: 'How disputes work',
        url: 'https://github.com/MatteoGabriele/agentscan#disputing-or-removing-a-claim',
      },
    ],
  },
  {
    title: 'Run AgentScan on your repository',
    description:
      'Install the GitHub App or add the action to a workflow and the same analysis runs against your own pull requests. Repositories running it publicly show up on the Used by page.',
    icon: 'i-lucide:heart-handshake',
    links: [
      { label: 'GitHub App', url: 'https://github.com/apps/agentscanapp' },
      {
        label: 'GitHub Action',
        url: 'https://github.com/MatteoGabriele/agentscan-action',
      },
      { label: 'Used by', url: '/adopters' },
    ],
  },
  {
    title: 'Improve the detection signals',
    description:
      'Detection is plain event analysis, no AI involved. Every signal has a label, a point value and a reason. New signals and better thresholds are welcome: open a pull request explaining what it detects and why it points at automation.',
    icon: 'i-lucide:shield-check',
    links: [
      {
        label: '@unveil/identity',
        url: 'https://github.com/unveil-project/identity',
      },
    ],
  },
  {
    title: 'Work on the ecosystem',
    description:
      'AgentScan is spread across multiple repositories. The website and the GitHub App live in agentscan, the GitHub Action lives in agentscan-action, the Ecosystem Activity data lives in agentscan-logs, and the detection itself lives in unveil-project/identity. Bug fixes, copy improvements and ideas are all welcome.',
    icon: 'i-lucide:git-pull-request',
    links: [
      {
        label: 'agentscan',
        url: 'https://github.com/MatteoGabriele/agentscan',
      },
      {
        label: 'agentscan-action',
        url: 'https://github.com/MatteoGabriele/agentscan-action',
      },
      {
        label: 'agentscan-logs',
        url: 'https://github.com/MatteoGabriele/agentscan-logs',
      },
      {
        label: 'unveil-project/identity',
        url: 'https://github.com/unveil-project/identity',
      },
    ],
  },
]

const { trackEvent } = useSaEvent()

useHead({
  title: 'Contribute | AgentScan',
  meta: [
    { property: 'og:title', content: 'Contribute | AgentScan' },
    {
      property: 'og:description',
      content: 'Ways to contribute to the AgentScan ecosystem',
    },
    { property: 'og:type', content: 'website' },
  ],
})
</script>

<template>
  <header class="text-center md:text-left">
    <h1 class="text-2xl font-semibold">Contribute</h1>
    <p class="text-ui-muted mt-2">
      AgentScan is an open project, and anything helps: reporting an automation,
      improving the copy or the UI, sharpening the analysis, or finding a bug.
    </p>
  </header>

  <ul class="mt-12 flex flex-col gap-4">
    <li
      v-for="contribution in contributions"
      :key="contribution.title"
      class="border border-ui-border/50 rounded-lg bg-white/1 p-6 hover:border-ui-border transition-colors"
    >
      <div class="flex items-start gap-3">
        <span
          class="mt-1 shrink-0 text-ui-muted"
          :class="contribution.icon"
          aria-hidden="true"
        ></span>

        <div class="flex-1">
          <h2 class="text-base font-semibold">{{ contribution.title }}</h2>

          <p class="mt-2 text-sm leading-relaxed text-ui-muted">
            {{ contribution.description }}
          </p>

          <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            <li v-for="link in contribution.links" :key="link.url">
              <NuxtLink
                :to="link.url"
                :external="link.url.startsWith('http')"
                :target="link.url.startsWith('http') ? '_blank' : undefined"
                rel="noopener"
                class="text-xs text-ui-muted/80 hover:text-ui-text transition-colors underline"
                @click="
                  trackEvent('contribute_link_clicked', { link: link.url })
                "
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </li>
  </ul>

  <p class="mt-12 text-sm text-ui-muted text-center md:text-left">
    Not sure where to start? Open an issue or a discussion, because an idea is a
    contribution too.
  </p>
</template>
