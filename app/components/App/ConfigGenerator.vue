<script setup lang="ts">
import { stringify } from 'yaml'
import { useClipboard } from '@vueuse/core'

type ScanMode = 'full' | 'comment' | 'labels' | 'silent'
type AuthorAssociation =
  | 'collaborator'
  | 'contributor'
  | 'first_timer'
  | 'first_time_contributor'
  | 'member'
  | 'owner'
type Classification = 'organic' | 'mixed' | 'automation'

const MODES: { value: ScanMode; label: string }[] = [
  { value: 'full', label: 'Full — comment and apply labels' },
  { value: 'comment', label: 'Comment only' },
  { value: 'labels', label: 'Labels only' },
  { value: 'silent', label: 'Silent — analysis only, no comment or labels' },
]

const AUTHOR_ASSOCIATIONS: { value: AuthorAssociation; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'member', label: 'Org member' },
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'first_timer', label: 'First-time contributor (first_timer)' },
  {
    value: 'first_time_contributor',
    label: 'First-time contributor to this repo',
  },
]

const CLASSIFICATIONS: { value: Classification; label: string }[] = [
  { value: 'organic', label: 'Organic' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'automation', label: 'Automation' },
]

const DEFAULT_LABELS = {
  'community-flagged': 'agentscan:community-flagged',
  mixed: 'agentscan:mixed-signals',
  automation: 'agentscan:automated-account',
}

const DEFAULT_AUTO_CLOSE_CLASSIFICATIONS: Classification[] = ['automation']

function sameMembers<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item))
}

const mode = ref<ScanMode>('full')
const scanPullRequests = ref(true)
const scanIssues = ref(false)
const allowedUsers = ref('')
const trustedAuthorAssociations = ref<AuthorAssociation[]>([])
const commentOnOrganic = ref(false)
const autoClose = ref(false)
const autoCloseClassifications = ref<Classification[]>(['automation'])

const labelCommunityFlagged = ref(DEFAULT_LABELS['community-flagged'])
const labelMixed = ref(DEFAULT_LABELS.mixed)
const labelAutomation = ref(DEFAULT_LABELS.automation)

const messageOrganic = ref('')
const messageMixed = ref('')
const messageAutomation = ref('')
const messageCommunityFlagged = ref('')

const allowedUsersList = computed(() =>
  allowedUsers.value
    .split(/[\n,]/)
    .map((user) => user.trim())
    .filter(Boolean),
)

const yaml = computed(() => {
  const config: Record<string, unknown> = { version: 1 }

  const scan: Record<string, boolean> = {}
  if (!scanPullRequests.value) {
    scan['pull-requests'] = false
  }
  if (scanIssues.value) {
    scan.issues = true
  }
  if (Object.keys(scan).length > 0) {
    config.scan = scan
  }

  if (allowedUsersList.value.length > 0) {
    config['allowed-users'] = allowedUsersList.value
  }

  if (trustedAuthorAssociations.value.length > 0) {
    config['trusted-author-associations'] = trustedAuthorAssociations.value
  }

  if (commentOnOrganic.value) {
    config['comment-on-organic'] = true
  }

  if (autoClose.value) {
    config['auto-close'] = true

    if (
      !sameMembers(
        autoCloseClassifications.value,
        DEFAULT_AUTO_CLOSE_CLASSIFICATIONS,
      )
    ) {
      config['auto-close-classifications'] = autoCloseClassifications.value
    }
  }

  if (mode.value !== 'full') {
    config.mode = mode.value
  }

  if (
    labelCommunityFlagged.value !== DEFAULT_LABELS['community-flagged'] ||
    labelMixed.value !== DEFAULT_LABELS.mixed ||
    labelAutomation.value !== DEFAULT_LABELS.automation
  ) {
    config.labels = {
      'community-flagged': labelCommunityFlagged.value,
      mixed: labelMixed.value,
      automation: labelAutomation.value,
    }
  }

  const messages: Record<string, string> = {}
  if (messageOrganic.value) {
    messages.organic = messageOrganic.value
  }
  if (messageMixed.value) {
    messages.mixed = messageMixed.value
  }
  if (messageAutomation.value) {
    messages.automation = messageAutomation.value
  }
  if (messageCommunityFlagged.value) {
    messages['community-flagged'] = messageCommunityFlagged.value
  }

  if (Object.keys(messages).length > 0) {
    config.messages = messages
  }

  return stringify(config, { lineWidth: 0 })
})

const { copy, copied } = useClipboard({ source: yaml })
</script>

<template>
  <div class="flex flex-col gap-8">
    <form class="flex flex-col gap-6" @submit.prevent>
      <fieldset class="flex flex-col gap-2">
        <legend class="font-semibold text-gh-text">Mode</legend>
        <p class="text-xs text-gh-muted">
          Controls what actions AgentScan takes on each PR/issue.
        </p>
        <select
          v-model="mode"
          class="mt-1 px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text focus:outline-none focus:border-gh-border-light"
        >
          <option v-for="item in MODES" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </fieldset>

      <fieldset class="flex flex-col gap-2">
        <legend class="font-semibold text-gh-text">Scan triggers</legend>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="scanPullRequests"
            type="checkbox"
            class="accent-gh-green"
          />
          Pull requests
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="scanIssues" type="checkbox" class="accent-gh-green" />
          Issues
        </label>
      </fieldset>

      <fieldset class="flex flex-col gap-2">
        <legend class="font-semibold text-gh-text">Allowed users</legend>
        <p class="text-xs text-gh-muted">
          GitHub usernames to exclude from scanning, one per line.
        </p>
        <textarea
          v-model="allowedUsers"
          rows="3"
          placeholder="dependabot[bot]&#10;renovate[bot]"
          class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono placeholder:text-gh-muted/60 focus:outline-none focus:border-gh-border-light"
        />
      </fieldset>

      <fieldset class="flex flex-col gap-2">
        <legend class="font-semibold text-gh-text">
          Trusted author associations
        </legend>
        <p class="text-xs text-gh-muted">
          Author associations to exclude from scanning.
        </p>
        <label
          v-for="item in AUTHOR_ASSOCIATIONS"
          :key="item.value"
          class="flex items-center gap-2 text-sm"
        >
          <input
            v-model="trustedAuthorAssociations"
            type="checkbox"
            :value="item.value"
            class="accent-gh-green"
          />
          {{ item.label }}
        </label>
      </fieldset>

      <fieldset class="flex flex-col gap-2">
        <legend class="font-semibold text-gh-text">Comments</legend>
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="commentOnOrganic"
            type="checkbox"
            class="accent-gh-green"
          />
          Comment even when the result is organic
        </label>
      </fieldset>

      <fieldset class="flex flex-col gap-2">
        <legend class="font-semibold text-gh-text">Auto-close</legend>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="autoClose" type="checkbox" class="accent-gh-green" />
          Automatically close PRs/issues opened by flagged accounts
        </label>

        <div v-if="autoClose" class="flex flex-col gap-2 mt-2 pl-6">
          <label
            v-for="item in CLASSIFICATIONS"
            :key="item.value"
            class="flex items-center gap-2 text-sm"
          >
            <input
              v-model="autoCloseClassifications"
              type="checkbox"
              :value="item.value"
              class="accent-gh-green"
            />
            {{ item.label }}
          </label>
        </div>
      </fieldset>

      <fieldset class="flex flex-col gap-3">
        <legend class="font-semibold text-gh-text">Labels</legend>
        <label class="flex flex-col gap-1 text-sm">
          Community-flagged
          <input
            v-model="labelCommunityFlagged"
            type="text"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Mixed signals
          <input
            v-model="labelMixed"
            type="text"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Automated account
          <input
            v-model="labelAutomation"
            type="text"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
      </fieldset>

      <fieldset class="flex flex-col gap-3">
        <legend class="font-semibold text-gh-text">Messages</legend>
        <p class="text-xs text-gh-muted">
          Custom comment messages per classification. Supports Markdown. Leave
          blank to use the default message.
        </p>
        <label class="flex flex-col gap-1 text-sm">
          Organic
          <textarea
            v-model="messageOrganic"
            rows="2"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Mixed
          <textarea
            v-model="messageMixed"
            rows="2"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Automation
          <textarea
            v-model="messageAutomation"
            rows="2"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Community-flagged
          <textarea
            v-model="messageCommunityFlagged"
            rows="2"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
      </fieldset>
    </form>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <p class="text-sm text-gh-muted">.github/agentscan.yml</p>
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-gh-border/60 hover:bg-gh-muted/20 transition-colors"
          @click="copy()"
        >
          <span
            :class="copied ? 'i-lucide:check' : 'i-lucide:copy'"
            aria-hidden="true"
          />
          {{ copied ? 'Copied' : 'Copy' }}
        </button>
      </div>

      <textarea
        :value="yaml"
        readonly
        rows="16"
        spellcheck="false"
        class="px-4 py-3 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono resize-y focus:outline-none"
      />
    </div>
  </div>
</template>
