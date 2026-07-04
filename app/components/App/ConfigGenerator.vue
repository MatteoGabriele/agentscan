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
const allowedUsersList = ref<string[]>([])
const newAllowedUser = ref('')
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
    <form class="flex flex-col gap-5" @submit.prevent>
      <fieldset
        class="flex flex-col gap-3 rounded-lg border border-gh-border/50 bg-gh-card p-4"
      >
        <legend class="px-1 font-semibold text-gh-text">Mode</legend>
        <p class="text-xs text-gh-muted">
          Controls what actions AgentScan takes on each PR/issue.
        </p>
        <div class="relative">
          <select
            v-model="mode"
            class="w-full appearance-none px-3 py-2 pr-9 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text focus:outline-none focus:border-gh-border-light"
          >
            <option v-for="item in MODES" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
          <span
            class="i-lucide:chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gh-muted pointer-events-none"
            aria-hidden="true"
          />
        </div>
      </fieldset>

      <fieldset
        class="flex flex-col gap-3 rounded-lg border border-gh-border/50 bg-gh-card p-4"
      >
        <legend class="px-1 font-semibold text-gh-text">Scan triggers</legend>
        <label
          class="flex items-center gap-2 text-sm hover:text-gh-text text-gh-text/90"
        >
          <input
            v-model="scanPullRequests"
            type="checkbox"
            class="accent-gh-green"
          />
          Pull requests
        </label>
        <label
          class="flex items-center gap-2 text-sm hover:text-gh-text text-gh-text/90"
        >
          <input v-model="scanIssues" type="checkbox" class="accent-gh-green" />
          Issues
        </label>
      </fieldset>

      <fieldset
        class="flex flex-col gap-3 rounded-lg border border-gh-border/50 bg-gh-card p-4"
      >
        <legend class="px-1 font-semibold text-gh-text">Allowed users</legend>
        <p class="text-xs text-gh-muted">
          GitHub usernames to exclude from scanning. Press Enter or comma to
          add.
        </p>
        <div
          class="flex flex-wrap items-center gap-1.5 px-2 py-1.5 bg-gh-bg border border-gh-border/60 rounded focus-within:border-gh-border-light"
        >
          <span
            v-for="(user, index) in allowedUsersList"
            :key="user"
            class="flex items-center gap-1 pl-2 pr-1 py-1 rounded bg-gh-muted/20 text-xs font-mono text-gh-text"
          >
            {{ user }}
            <button
              type="button"
              class="flex rounded hover:bg-gh-muted/30 p-0.5"
              @click="removeAllowedUser(index)"
            >
              <span class="i-lucide:x text-xs" aria-hidden="true" />
              <span class="sr-only">Remove {{ user }}</span>
            </button>
          </span>
          <input
            v-model="newAllowedUser"
            type="text"
            placeholder="dependabot[bot]"
            class="flex-1 min-w-32 px-1 py-1 bg-transparent text-sm text-gh-text font-mono placeholder:text-gh-muted/60 focus:outline-none"
            @keydown.enter.prevent="addAllowedUser"
            @keydown.,.prevent="addAllowedUser"
            @keydown.backspace="removeLastAllowedUser"
            @blur="addAllowedUser"
          />
        </div>
      </fieldset>

      <fieldset
        class="flex flex-col gap-3 rounded-lg border border-gh-border/50 bg-gh-card p-4"
      >
        <legend class="px-1 font-semibold text-gh-text">
          Trusted author associations
        </legend>
        <p class="text-xs text-gh-muted">
          Author associations to exclude from scanning.
        </p>
        <div class="flex flex-col gap-2">
          <label
            v-for="item in AUTHOR_ASSOCIATIONS"
            :key="item.value"
            class="flex items-center gap-2 text-sm hover:text-gh-text text-gh-text/90"
          >
            <input
              v-model="trustedAuthorAssociations"
              type="checkbox"
              :value="item.value"
              class="accent-gh-green"
            />
            {{ item.label }}
          </label>
        </div>
      </fieldset>

      <fieldset
        class="flex flex-col gap-3 rounded-lg border border-gh-border/50 bg-gh-card p-4"
      >
        <legend class="px-1 font-semibold text-gh-text">Comments</legend>
        <label
          class="flex items-center gap-2 text-sm hover:text-gh-text text-gh-text/90"
        >
          <input
            v-model="commentOnOrganic"
            type="checkbox"
            class="accent-gh-green"
          />
          Comment even when the result is organic
        </label>
      </fieldset>

      <fieldset
        class="flex flex-col gap-3 rounded-lg border border-gh-border/50 bg-gh-card p-4"
      >
        <legend class="px-1 font-semibold text-gh-text">Auto-close</legend>
        <label
          class="flex items-center gap-2 text-sm hover:text-gh-text text-gh-text/90"
        >
          <input v-model="autoClose" type="checkbox" class="accent-gh-green" />
          Automatically close PRs/issues opened by flagged accounts
        </label>

        <div
          v-if="autoClose"
          class="flex flex-col gap-2 mt-1 pl-6 border-l border-gh-border/40"
        >
          <label
            v-for="item in CLASSIFICATIONS"
            :key="item.value"
            class="flex items-center gap-2 text-sm hover:text-gh-text text-gh-text/90 pl-3"
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

      <fieldset
        class="flex flex-col gap-4 rounded-lg border border-gh-border/50 bg-gh-card p-4"
      >
        <legend class="px-1 font-semibold text-gh-text">Labels</legend>
        <label class="flex flex-col gap-1.5 text-sm">
          Community-flagged
          <input
            v-model="labelCommunityFlagged"
            type="text"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          Mixed signals
          <input
            v-model="labelMixed"
            type="text"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
        <label class="flex flex-col gap-1.5 text-sm">
          Automated account
          <input
            v-model="labelAutomation"
            type="text"
            class="px-3 py-2 bg-gh-bg border border-gh-border/60 rounded text-sm text-gh-text font-mono focus:outline-none focus:border-gh-border-light"
          />
        </label>
      </fieldset>

      <fieldset
        class="flex flex-col gap-4 rounded-lg border border-gh-border/50 bg-gh-card p-4"
      >
        <legend class="px-1 font-semibold text-gh-text">Messages</legend>
        <p class="text-xs text-gh-muted -mt-2">
          Custom comment messages per classification. Supports Markdown. Leave
          blank to use the default message.
        </p>
        <div class="flex flex-col gap-1.5 text-sm">
          <span>Organic</span>
          <CommonMarkdownEditor
            v-model="messageOrganic"
            placeholder="Default message"
          />
        </div>
        <div class="flex flex-col gap-1.5 text-sm">
          <span>Mixed</span>
          <CommonMarkdownEditor
            v-model="messageMixed"
            placeholder="Default message"
          />
        </div>
        <div class="flex flex-col gap-1.5 text-sm">
          <span>Automation</span>
          <CommonMarkdownEditor
            v-model="messageAutomation"
            placeholder="Default message"
          />
        </div>
        <div class="flex flex-col gap-1.5 text-sm">
          <span>Community-flagged</span>
          <CommonMarkdownEditor
            v-model="messageCommunityFlagged"
            placeholder="Default message"
          />
        </div>
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
