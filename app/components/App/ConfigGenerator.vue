<script setup lang="ts">
import { stringify } from 'yaml'
import { useClipboard } from '@vueuse/core'
import {
  buildDefaultFirstTimeHoneypotGreeting,
  buildDefaultHoneypotGreeting,
  getDefaultMessages,
} from '~~/shared/utils/agentscan-messages'

type ScanMode = 'full' | 'comment' | 'labels' | 'silent'
type AuthorAssociation =
  | 'collaborator'
  | 'contributor'
  | 'first_timer'
  | 'first_time_contributor'
  | 'member'
  | 'owner'
type Classification = 'organic' | 'mixed' | 'automation'

const modes: { value: ScanMode; label: string }[] = [
  { value: 'full', label: 'Full — comment and apply labels' },
  { value: 'comment', label: 'Comment only' },
  { value: 'labels', label: 'Labels only' },
  { value: 'silent', label: 'Silent — analysis only, no comment or labels' },
]

const authorAssociations: { value: AuthorAssociation; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'member', label: 'Member' },
  { value: 'collaborator', label: 'Collaborator' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'first_timer', label: 'First timer (new to GitHub)' },
  {
    value: 'first_time_contributor',
    label: 'First-time contributor (new to this repo)',
  },
]

const classifications: { value: Classification; label: string }[] = [
  { value: 'organic', label: 'Organic' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'automation', label: 'Automation' },
]

const defaultLabels = {
  'community-flagged': 'agentscan:community-flagged',
  mixed: 'agentscan:mixed-signals',
  automation: 'agentscan:automation-signals',
}

const defaultAutoCloseClassifications: Classification[] = ['automation']

const defaultMessages = getDefaultMessages()

function sameMembers<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item))
}

const mode = ref<ScanMode>('full')
const scanPullRequests = ref(true)
const scanIssues = ref(false)
const allowedUsersList = ref<string[]>([])
const newAllowedUser = ref('')
const trustedAuthorAssociations = ref<AuthorAssociation[]>([])
const commentOnOrganic = ref(false)
const autoClose = ref(false)
const autoCloseClassifications = ref<Classification[]>(['automation'])
const honeypot = ref(false)

const labelCommunityFlagged = ref(defaultLabels['community-flagged'])
const labelMixed = ref(defaultLabels.mixed)
const labelAutomation = ref(defaultLabels.automation)

const messageOrganic = ref('')
const messageMixed = ref('')
const messageAutomation = ref('')
const messageCommunityFlagged = ref('')
const messageHoneypot = ref('')
const messageHoneypotFirstTime = ref('')

function addAllowedUser() {
  const users = newAllowedUser.value
    .split(/[\n,]/)
    .map((user) => user.trim())
    .filter(Boolean)

  for (const user of users) {
    if (!allowedUsersList.value.includes(user)) {
      allowedUsersList.value.push(user)
    }
  }

  newAllowedUser.value = ''
}

function removeAllowedUser(index: number) {
  allowedUsersList.value.splice(index, 1)
}

function removeLastAllowedUser() {
  if (newAllowedUser.value === '' && allowedUsersList.value.length > 0) {
    allowedUsersList.value.pop()
  }
}

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
        defaultAutoCloseClassifications,
      )
    ) {
      config['auto-close-classifications'] = autoCloseClassifications.value
    }
  }

  if (honeypot.value) {
    config.honeypot = true
  }

  if (mode.value !== 'full') {
    config.mode = mode.value
  }

  if (
    labelCommunityFlagged.value !== defaultLabels['community-flagged'] ||
    labelMixed.value !== defaultLabels.mixed ||
    labelAutomation.value !== defaultLabels.automation
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
  if (honeypot.value && messageHoneypot.value) {
    messages.honeypot = messageHoneypot.value
  }
  if (honeypot.value && messageHoneypotFirstTime.value) {
    messages['honeypot-first-time'] = messageHoneypotFirstTime.value
  }

  if (Object.keys(messages).length > 0) {
    config.messages = messages
  }

  return stringify(config, { lineWidth: 0 })
})

const defaultHoneypotGreeting = computed(() =>
  buildDefaultHoneypotGreeting({
    username: '{username}',
    subject: '{type}',
    isPR: scanPullRequests.value,
  })
    .join('\n')
    .trim(),
)

const defaultHoneypotFirstTimeGreeting = computed(() =>
  buildDefaultFirstTimeHoneypotGreeting({
    username: '{username}',
    subject: '{type}',
    isPR: scanPullRequests.value,
  })
    .join('\n')
    .trim(),
)

const { copy, copied } = useClipboard({ source: yaml })
</script>

<template>
  <div class="flex flex-col gap-10">
    <form class="flex flex-col" @submit.prevent>
      <fieldset
        class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6 not-last:border-b border-ui-border-subtle/20 first:pt-0"
      >
        <legend class="sr-only">Mode</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">Mode</p>
          <p class="text-xs text-ui-muted mt-1">
            Controls what actions AgentScan takes on each PR/issue.
          </p>
        </div>
        <div class="relative self-start">
          <select
            v-model="mode"
            class="w-full appearance-none px-3 py-2 pr-9 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text focus:outline-none focus:border-ui-accent focus:ring-1 focus:ring-ui-accent/30"
          >
            <option v-for="item in modes" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
          <span
            class="i-lucide:chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-ui-muted pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </fieldset>

      <fieldset
        class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6 not-last:border-b border-ui-border-subtle/20 first:pt-0"
      >
        <legend class="sr-only">Scan triggers</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">Scan triggers</p>
        </div>
        <div class="flex flex-col gap-2 self-start">
          <label
            class="flex items-center gap-2 text-sm hover:text-ui-text text-ui-text/90"
          >
            <input
              v-model="scanPullRequests"
              type="checkbox"
              class="accent-ui-accent"
            />
            Pull requests
          </label>
          <label
            class="flex items-center gap-2 text-sm hover:text-ui-text text-ui-text/90"
          >
            <input
              v-model="scanIssues"
              type="checkbox"
              class="accent-ui-accent"
            />
            Issues
          </label>
        </div>
      </fieldset>

      <fieldset
        class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6 not-last:border-b border-ui-border-subtle/20 first:pt-0"
      >
        <legend class="sr-only">Allowed users</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">Allowed users</p>
          <p class="text-xs text-ui-muted mt-1">
            GitHub usernames to exclude from scanning. GitHub Apps (e.g.
            dependabot[bot]) are detected automatically and never flagged.
          </p>
        </div>
        <div class="self-start">
          <div
            class="flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-ui-bg border border-ui-border/60 rounded focus-within:border-ui-accent focus-within:ring-1 focus-within:ring-ui-accent/30"
          >
            <span
              v-for="(user, index) in allowedUsersList"
              :key="user"
              class="flex items-center gap-1 pl-2 pr-1 py-1 rounded bg-ui-muted/20 text-xs font-mono text-ui-text"
            >
              {{ user }}
              <button
                type="button"
                class="flex rounded hover:bg-ui-muted/30 p-0.5"
                @click="removeAllowedUser(index)"
              >
                <span class="i-lucide:x text-xs" aria-hidden="true" />
                <span class="sr-only">Remove {{ user }}</span>
              </button>
            </span>
            <input
              v-model="newAllowedUser"
              type="text"
              placeholder="Add username"
              class="flex-1 min-w-32 px-1 py-1 bg-transparent text-sm text-ui-text font-mono placeholder:text-ui-muted/60 focus:outline-none"
              @keydown.enter.prevent="addAllowedUser"
              @keydown.,.prevent="addAllowedUser"
              @keydown.backspace="removeLastAllowedUser"
              @blur="addAllowedUser"
            />
          </div>
          <p class="text-xs text-ui-muted mt-1">Press Enter or comma to add.</p>
        </div>
      </fieldset>

      <fieldset
        class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6 not-last:border-b border-ui-border-subtle/20 first:pt-0"
      >
        <legend class="sr-only">Trusted author associations</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">
            Trusted author associations
          </p>
          <p class="text-xs text-ui-muted mt-1">
            Author associations to exclude from scanning.
          </p>
        </div>
        <div class="flex flex-col gap-2 self-start">
          <label
            v-for="item in authorAssociations"
            :key="item.value"
            class="flex items-center gap-2 text-sm hover:text-ui-text text-ui-text/90"
          >
            <input
              v-model="trustedAuthorAssociations"
              type="checkbox"
              :value="item.value"
              class="accent-ui-accent"
            />
            {{ item.label }}
          </label>
        </div>
      </fieldset>

      <fieldset
        class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6 not-last:border-b border-ui-border-subtle/20 first:pt-0"
      >
        <legend class="sr-only">Comments</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">Comments</p>
        </div>
        <div class="self-start">
          <label
            class="flex items-center gap-2 text-sm hover:text-ui-text text-ui-text/90"
          >
            <input
              v-model="commentOnOrganic"
              type="checkbox"
              class="accent-ui-accent"
            />
            Comment even when the result is organic
          </label>
        </div>
      </fieldset>

      <fieldset
        class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6 not-last:border-b border-ui-border-subtle/20 first:pt-0"
      >
        <legend class="sr-only">Auto-close</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">Auto-close</p>
        </div>
        <div class="self-start">
          <label
            class="flex items-center gap-2 text-sm hover:text-ui-text text-ui-text/90"
          >
            <input
              v-model="autoClose"
              type="checkbox"
              class="accent-ui-accent"
            />
            Automatically close PRs/issues opened by flagged accounts
          </label>

          <div v-if="autoClose" class="flex flex-col gap-2 mt-3 pl-6">
            <label
              v-for="item in classifications"
              :key="item.value"
              class="flex items-center gap-2 text-sm hover:text-ui-text text-ui-text/90"
            >
              <input
                v-model="autoCloseClassifications"
                type="checkbox"
                :value="item.value"
                class="accent-ui-accent"
              />
              {{ item.label }}
            </label>
          </div>
        </div>
      </fieldset>

      <fieldset
        class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6 not-last:border-b border-ui-border-subtle/20 first:pt-0"
      >
        <legend class="sr-only">Honeypot</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">Honeypot</p>
          <p class="text-xs text-ui-muted mt-1">
            Posts an ordinary thank-you comment with a one-off verification code
            hidden in its raw Markdown, addressed only at AI agents. An agent
            that reads the page source and replies with the code identifies
            itself.
          </p>
        </div>
        <div class="self-start">
          <label
            class="flex items-center gap-2 text-sm hover:text-ui-text text-ui-text/90"
          >
            <input
              v-model="honeypot"
              type="checkbox"
              class="accent-ui-accent"
            />
            Post a honeypot comment on new PRs/issues
          </label>

          <p v-if="honeypot" class="text-xs text-ui-muted mt-3 pl-6">
            <template v-if="autoClose"
              >When the code comes back, the PR/issue is closed.</template
            ><template v-else
              >Enable auto-close above to close the PR/issue when the code comes
              back.</template
            >
          </p>

          <div v-if="honeypot" class="min-w-0 flex flex-col gap-1.5 mt-4 pl-6">
            <div class="text-xs text-ui-muted mb-2">
              Default greeting
              <pre
                class="mt-2 px-3 py-2 bg-ui-bg border border-ui-border/60 rounded font-mono text-ui-text/90 whitespace-pre-wrap"
                >{{ defaultHoneypotGreeting }}</pre
              >
            </div>

            <CommonMarkdownEditor
              v-model="messageHoneypot"
              placeholder="Custom greeting"
            />
            <p class="text-xs text-ui-muted">
              Replaces the visible thank-you message. The hidden verification
              code is always added underneath. Use
              <span class="font-mono">{username}</span> and
              <span class="font-mono">{type}</span> (pull request or issue) as
              placeholders.
            </p>
          </div>

          <div v-if="honeypot" class="min-w-0 flex flex-col gap-1.5 mt-6 pl-6">
            <p class="text-sm font-medium text-ui-text">
              First-time contributors
            </p>
            <div class="text-xs text-ui-muted mb-2 mt-1">
              Default greeting for an author opening their first PR/issue on the
              repository
              <pre
                class="mt-2 px-3 py-2 bg-ui-bg border border-ui-border/60 rounded font-mono text-ui-text/90 whitespace-pre-wrap"
                >{{ defaultHoneypotFirstTimeGreeting }}</pre
              >
            </div>

            <CommonMarkdownEditor
              v-model="messageHoneypotFirstTime"
              placeholder="Custom greeting for first-time contributors"
            />
            <p class="text-xs text-ui-muted">
              Used instead of the greeting above when GitHub reports the author
              as a first timer or first-time contributor. Left blank, first-time
              contributors get your regular custom greeting.
            </p>
          </div>
        </div>
      </fieldset>

      <fieldset
        class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6 not-last:border-b border-ui-border-subtle/20 first:pt-0"
      >
        <legend class="sr-only">Labels</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">Labels</p>
        </div>
        <div class="flex flex-col gap-3 self-start">
          <label class="flex flex-col gap-1.5 text-sm">
            <span class="text-xs text-ui-muted">Community-flagged</span>
            <input
              v-model="labelCommunityFlagged"
              type="text"
              class="px-3 py-2 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text font-mono focus:outline-none focus:border-ui-accent focus:ring-1 focus:ring-ui-accent/30"
            />
          </label>
          <label class="flex flex-col gap-1.5 text-sm">
            <span class="text-xs text-ui-muted">Mixed signals</span>
            <input
              v-model="labelMixed"
              type="text"
              class="px-3 py-2 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text font-mono focus:outline-none focus:border-ui-accent focus:ring-1 focus:ring-ui-accent/30"
            />
          </label>
          <label class="flex flex-col gap-1.5 text-sm">
            <span class="text-xs text-ui-muted">Automated account</span>
            <input
              v-model="labelAutomation"
              type="text"
              class="px-3 py-2 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text font-mono focus:outline-none focus:border-ui-accent focus:ring-1 focus:ring-ui-accent/30"
            />
          </label>
        </div>
      </fieldset>

      <fieldset class="grid gap-x-8 gap-y-2 sm:grid-cols-[200px_1fr] py-6">
        <legend class="sr-only">Messages</legend>
        <div>
          <p class="text-sm font-medium text-ui-text">Messages</p>
          <p class="text-xs text-ui-muted mt-1">
            Custom comment messages per classification. Supports Markdown. Leave
            a field blank to post the default message shown in it.
          </p>
        </div>
        <div class="min-w-0 flex flex-col gap-4 self-start">
          <div class="flex flex-col gap-1.5 text-sm">
            <span class="text-xs text-ui-muted">Organic</span>
            <CommonMarkdownEditor
              v-model="messageOrganic"
              :placeholder="defaultMessages.organic"
            />
          </div>
          <div class="flex flex-col gap-1.5 text-sm">
            <span class="text-xs text-ui-muted">Mixed</span>
            <CommonMarkdownEditor
              v-model="messageMixed"
              :placeholder="defaultMessages.mixed"
            />
          </div>
          <div class="flex flex-col gap-1.5 text-sm">
            <span class="text-xs text-ui-muted">Automation</span>
            <CommonMarkdownEditor
              v-model="messageAutomation"
              :placeholder="defaultMessages.automation"
            />
          </div>
          <div class="flex flex-col gap-1.5 text-sm">
            <span class="text-xs text-ui-muted">Community-flagged</span>
            <CommonMarkdownEditor
              v-model="messageCommunityFlagged"
              :placeholder="defaultMessages['community-flagged']"
            />
          </div>
        </div>
      </fieldset>
    </form>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <p class="text-sm text-ui-muted">.github/agentscan.yml</p>
        <button
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-ui-border/60 hover:bg-ui-muted/20 transition-colors"
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
        class="px-4 py-3 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text font-mono resize-y focus:outline-none"
      />
    </div>
  </div>
</template>
