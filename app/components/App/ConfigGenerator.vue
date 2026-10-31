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
// A community flag is a state of the account rather than an analysis result,
// but it replaces the result's title, comment and label, so the form treats it
// as one.
type Classification =
  'organic' | 'mixed' | 'automation' | 'community-flagged' | 'insufficient-data'
type LabelledClassification = 'mixed' | 'automation' | 'community-flagged'

const modes: { value: ScanMode; label: string; hint: string }[] = [
  {
    value: 'full',
    label: 'Comment and label',
    hint: 'Posts the result as a comment and adds a label.',
  },
  {
    value: 'comment',
    label: 'Comment only',
    hint: 'Posts the result as a comment. No label.',
  },
  {
    value: 'labels',
    label: 'Label only',
    hint: 'Adds a label. No comment.',
  },
  {
    value: 'silent',
    label: 'Silent',
    hint: 'Posts nothing. Auto-close and the honeypot still work.',
  },
]

const authorAssociations: {
  value: AuthorAssociation
  label: string
  hint: string
}[] = [
  { value: 'owner', label: 'Owner', hint: 'Owns the repository' },
  { value: 'member', label: 'Member', hint: 'Belongs to the organization' },
  {
    value: 'collaborator',
    label: 'Collaborator',
    hint: 'Invited to the repository',
  },
  {
    value: 'contributor',
    label: 'Contributor',
    hint: 'Has committed to the repository before',
  },
  {
    value: 'first_time_contributor',
    label: 'First-time contributor',
    hint: 'First contribution to this repository',
  },
  {
    value: 'first_timer',
    label: 'First timer',
    hint: 'First contribution anywhere on GitHub',
  },
]

const defaultMessages = getDefaultMessages()

const classificationInfo: Record<
  Classification,
  { label: string; when: string; dot: string; defaultLabel?: string }
> = {
  automation: {
    label: 'Automation',
    when: 'The account’s activity looks automated.',
    dot: 'bg-ui-automation',
    defaultLabel: 'agentscan:automation-signals',
  },
  mixed: {
    label: 'Mixed',
    when: 'Some activity looks automated, some looks human.',
    dot: 'bg-ui-mixed',
    defaultLabel: 'agentscan:mixed-signals',
  },
  'community-flagged': {
    label: 'Community-flagged',
    when: 'The account is on the community list of verified automated accounts. This replaces the analysis result.',
    dot: 'bg-ui-destructive',
    defaultLabel: 'agentscan:community-flagged',
  },
  organic: {
    label: 'Organic',
    when: 'No signs of automation were found.',
    dot: 'bg-ui-organic',
  },
  'insufficient-data': {
    label: 'Not enough data',
    when: 'The account has too little public activity to judge.',
    dot: 'bg-ui-muted',
  },
}

const tabOrder: Classification[] = [
  'automation',
  'mixed',
  'community-flagged',
  'organic',
  'insufficient-data',
]

const classifications = tabOrder.map((value) => ({
  value,
  ...classificationInfo[value],
}))

// What `auto-close-classifications` accepts. Community-flagged accounts are not
// in it: the app closes them whenever auto-close is on.
const autoCloseOptions = classifications.filter(
  (item) =>
    item.value === 'organic' ||
    item.value === 'mixed' ||
    item.value === 'automation',
)

const defaultAutoCloseClassifications: Classification[] = ['automation']

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
const autoCloseClassifications = ref<Classification[]>([
  ...defaultAutoCloseClassifications,
])
const honeypot = ref(false)

const labels = reactive<Record<LabelledClassification, string>>({
  mixed: 'agentscan:mixed-signals',
  automation: 'agentscan:automation-signals',
  'community-flagged': 'agentscan:community-flagged',
})

const messages = reactive<Record<Classification, string>>({
  organic: '',
  mixed: '',
  automation: '',
  'community-flagged': '',
  'insufficient-data': '',
})

const messageHoneypot = ref('')
const messageHoneypotFirstTime = ref('')

const postsComments = computed(
  () => mode.value === 'full' || mode.value === 'comment',
)
const addsLabels = computed(
  () => mode.value === 'full' || mode.value === 'labels',
)

const activeTab = ref<Classification>('automation')
const activeClassification = computed(() => classificationInfo[activeTab.value])
const tabsId = useId()

function isCustomized(item: (typeof classifications)[number]) {
  const label = labels[item.value as LabelledClassification]
  return (
    messages[item.value] !== '' ||
    (item.defaultLabel !== undefined && label !== item.defaultLabel)
  )
}

function selectTab(index: number) {
  const item = classifications.at(index % classifications.length)
  if (!item) {
    return
  }

  activeTab.value = item.value
  document.getElementById(`${tabsId}-${item.value}`)?.focus()
}

function onTabKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    selectTab(index + 1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    selectTab(index - 1)
  }
}

function addAllowedUser() {
  const users = newAllowedUser.value
    .split(/[\n,]/)
    .map((user) => user.trim().replace(/^@/, ''))
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

  const customLabels: Record<string, string> = {}
  for (const item of classifications) {
    const label = labels[item.value as LabelledClassification]
    if (item.defaultLabel !== undefined && label !== item.defaultLabel) {
      customLabels[item.value] = label
    }
  }
  if (Object.keys(customLabels).length > 0) {
    config.labels = customLabels
  }

  const customMessages: Record<string, string> = {}
  for (const item of classifications) {
    if (messages[item.value]) {
      customMessages[item.value] = messages[item.value]
    }
  }
  if (honeypot.value && messageHoneypot.value) {
    customMessages.honeypot = messageHoneypot.value
  }
  if (honeypot.value && messageHoneypotFirstTime.value) {
    customMessages['honeypot-first-time'] = messageHoneypotFirstTime.value
  }
  if (Object.keys(customMessages).length > 0) {
    config.messages = customMessages
  }

  return stringify(config, { lineWidth: 0 })
})

const isDefaultConfig = computed(() => yaml.value.trim() === 'version: 1')

const defaultHoneypotGreeting = computed(() =>
  buildDefaultHoneypotGreeting({
    username: '{username}',
    subject: '{type}',
    isPR: scanPullRequests.value,
  })
    .join('\n')
    .trim(),
)

// A blank first-time greeting falls back to the regular custom greeting first,
// and only then to the built-in first-time one. Show whichever will be sent.
const defaultHoneypotFirstTimeGreeting = computed(
  () =>
    messageHoneypot.value.trim() ||
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
  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
    <form class="flex flex-col gap-6 min-w-0" @submit.prevent>
      <AppConfigSection
        title="What to scan"
        icon="i-lucide:scan-search"
        hint="AgentScan checks the author when one of these is opened."
      >
        <div class="flex flex-col gap-3">
          <AppConfigCheckbox
            v-model="scanPullRequests"
            label="Pull requests"
            hint="On by default."
          />
          <AppConfigCheckbox
            v-model="scanIssues"
            label="Issues"
            hint="Off by default."
          />
        </div>
      </AppConfigSection>

      <AppConfigSection
        title="Who to skip"
        icon="i-lucide:user-check"
        hint="Authors matching any of these are never scanned."
      >
        <AppConfigField label="Usernames">
          <template #hint>
            Bots such as
            <span class="font-mono">dependabot[bot]</span>
            are recognized automatically. Usernames must match exactly,
            including capitalization.
          </template>

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
              aria-label="Add a username"
              placeholder="Type a username, then Enter"
              class="flex-1 min-w-40 px-1 py-1 bg-transparent text-sm text-ui-text font-mono placeholder:text-ui-muted/60 focus:outline-none"
              @keydown.enter.prevent="addAllowedUser"
              @keydown.,.prevent="addAllowedUser"
              @keydown.backspace="removeLastAllowedUser"
              @blur="addAllowedUser"
            />
          </div>
        </AppConfigField>

        <AppConfigField
          label="Roles"
          hint="Based on the author’s relationship to the repository, as GitHub reports it."
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <AppConfigCheckbox
              v-for="item in authorAssociations"
              :key="item.value"
              v-model="trustedAuthorAssociations"
              :value="item.value"
              :label="item.label"
              :hint="item.hint"
            />
          </div>
        </AppConfigField>
      </AppConfigSection>

      <AppConfigSection title="What happens after a scan" icon="i-lucide:zap">
        <AppConfigField
          label="Mode"
          hint="How AgentScan reports the result on the pull request or issue."
        >
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="item in modes"
              :key="item.value"
              class="flex items-start gap-2.5 p-3 rounded border cursor-pointer transition-colors"
              :class="
                mode === item.value
                  ? 'border-ui-accent bg-ui-accent/5'
                  : 'border-ui-border/60 hover:border-ui-border'
              "
            >
              <input
                v-model="mode"
                type="radio"
                name="mode"
                :value="item.value"
                class="mt-1 shrink-0 accent-ui-accent"
              />
              <span class="flex flex-col">
                <span class="text-sm font-medium text-ui-text">
                  {{ item.label }}
                </span>
                <span class="text-xs text-ui-muted">{{ item.hint }}</span>
              </span>
            </label>
          </div>
        </AppConfigField>

        <AppConfigCheckbox
          v-model="commentOnOrganic"
          label="Comment on organic results too"
          hint="By default AgentScan stays quiet when it finds no sign of automation."
        />

        <div>
          <AppConfigCheckbox
            v-model="autoClose"
            label="Close automatically"
            hint="Closes the pull request or issue as “not planned” when the result is one you pick below."
          />

          <div v-if="autoClose" class="mt-3 pl-6.5">
            <div
              class="flex flex-wrap gap-2"
              role="group"
              aria-label="Results that close the pull request or issue"
            >
              <label
                v-for="item in autoCloseOptions"
                :key="item.value"
                class="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors"
                :class="
                  autoCloseClassifications.includes(item.value)
                    ? 'border-ui-accent bg-ui-accent/5 text-ui-text'
                    : 'border-ui-border/60 text-ui-text/80 hover:border-ui-border'
                "
              >
                <input
                  v-model="autoCloseClassifications"
                  type="checkbox"
                  :value="item.value"
                  class="accent-ui-accent"
                />
                {{ item.label }}
              </label>
              <label
                class="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border border-ui-accent/50 bg-ui-accent/5 text-sm text-ui-text/80 cursor-not-allowed"
              >
                <input
                  type="checkbox"
                  checked
                  disabled
                  class="accent-ui-accent"
                />
                Community-flagged
              </label>
            </div>
            <p class="mt-2 text-xs text-ui-muted text-pretty">
              Community-flagged accounts are always closed while this is on.
              <template v-if="autoCloseClassifications.length === 0">
                With nothing else picked, they are the only ones closed.
              </template>
            </p>
          </div>
        </div>
      </AppConfigSection>

      <AppConfigSection
        title="Results"
        icon="i-lucide:tags"
        hint="Change the label and the comment for each result. Comments support Markdown. Anything you leave untouched keeps its default."
      >
        <div>
          <div
            role="tablist"
            aria-label="Results"
            class="flex flex-wrap gap-1 p-1 rounded-2 bg-ui-muted/10"
          >
            <button
              v-for="(item, index) in classifications"
              :id="`${tabsId}-${item.value}`"
              :key="item.value"
              type="button"
              role="tab"
              :aria-selected="activeTab === item.value"
              :aria-controls="`${tabsId}-panel`"
              :tabindex="activeTab === item.value ? 0 : -1"
              class="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors"
              :class="
                activeTab === item.value
                  ? 'bg-ui-bg text-ui-text shadow-sm'
                  : 'text-ui-muted hover:text-ui-text'
              "
              @click="activeTab = item.value"
              @keydown="onTabKeydown($event, index)"
            >
              <span
                class="size-2 rounded-full shrink-0"
                :class="item.dot"
                aria-hidden="true"
              />
              {{ item.label }}
              <template v-if="isCustomized(item)">
                <span
                  class="i-lucide:pencil text-xs text-ui-muted"
                  aria-hidden="true"
                />
                <span class="sr-only">(customized)</span>
              </template>
            </button>
          </div>

          <div
            :id="`${tabsId}-panel`"
            role="tabpanel"
            :aria-labelledby="`${tabsId}-${activeTab}`"
            class="flex flex-col gap-6 pt-5"
          >
            <div class="flex flex-col gap-1.5">
              <p class="text-sm text-ui-text/90">
                <span class="font-medium">When:</span>
                {{ activeClassification.when }}
              </p>
              <p
                v-if="mode === 'silent'"
                class="flex items-start gap-1.5 text-xs text-ui-muted"
              >
                <span
                  class="i-lucide:info shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                Silent mode posts no label or comment.
              </p>
              <p
                v-else-if="activeTab === 'organic' && !commentOnOrganic"
                class="flex items-start gap-1.5 text-xs text-ui-muted"
              >
                <span
                  class="i-lucide:info shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                Only posted when “Comment on organic results too” is on.
              </p>
            </div>

            <p
              v-if="!activeClassification.defaultLabel"
              class="text-sm text-ui-muted"
            >
              No label is added for this result.
            </p>

            <AppConfigField
              v-else
              :key="`label-${activeTab}`"
              label="Label"
              :hint="
                addsLabels
                  ? 'Added to the pull request or issue.'
                  : 'Not added in the current mode.'
              "
            >
              <input
                v-model="labels[activeTab as LabelledClassification]"
                type="text"
                aria-label="Label name"
                :placeholder="activeClassification.defaultLabel"
                class="w-full px-3 py-2 bg-ui-bg border border-ui-border/60 rounded text-sm text-ui-text font-mono focus:outline-none focus:border-ui-accent focus:ring-1 focus:ring-ui-accent/30"
              />
            </AppConfigField>

            <AppConfigField
              :key="`message-${activeTab}`"
              label="Comment"
              :hint="
                postsComments
                  ? 'Shown under the result title, followed by a link to the full analysis.'
                  : 'Not posted in the current mode.'
              "
            >
              <AppConfigMessage
                v-model="messages[activeTab]"
                :default-message="defaultMessages[activeTab]"
              />
            </AppConfigField>
          </div>
        </div>
      </AppConfigSection>

      <AppConfigSection
        title="Honeypot"
        icon="i-lucide:bot"
        hint="A trap that gets AI agents to identify themselves."
      >
        <div>
          <AppConfigCheckbox
            v-model="honeypot"
            label="Post a honeypot comment"
            hint="Posts a friendly thank-you comment on each scanned pull request or issue that stays open. Hidden in it is a short code with instructions only an AI agent would read. If the author replies with that code, AgentScan reports them as automated."
          />

          <p
            v-if="honeypot"
            class="flex items-start gap-1.5 mt-3 pl-6.5 text-xs text-ui-muted"
          >
            <span class="i-lucide:info shrink-0 mt-0.5" aria-hidden="true" />
            <template v-if="autoClose">
              The pull request or issue is also closed, because auto-close is
              on.
            </template>
            <template v-else>
              Turn on “Close automatically” to also close the pull request or
              issue.
            </template>
          </p>
        </div>

        <template v-if="honeypot">
          <AppConfigField
            label="Greeting"
            hint="The visible part of the comment. The hidden code is always added below it."
          >
            <AppConfigMessage
              v-model="messageHoneypot"
              :default-message="defaultHoneypotGreeting"
              :placeholders="['username', 'type']"
            />
          </AppConfigField>

          <AppConfigField
            label="Greeting for first-time contributors"
            hint="Used instead when the author is opening their first pull request or issue on this repository."
          >
            <AppConfigMessage
              v-model="messageHoneypotFirstTime"
              :default-message="defaultHoneypotFirstTimeGreeting"
              :placeholders="['username', 'type']"
            />
          </AppConfigField>
        </template>
      </AppConfigSection>
    </form>

    <aside
      class="flex flex-col gap-3 min-w-0 lg:sticky lg:top-20"
      aria-label="Generated configuration"
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-mono text-ui-muted">.github/agentscan.yml</p>
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

      <pre
        class="px-4 py-3 bg-ui-card border border-ui-border/60 rounded text-sm text-ui-text font-mono overflow-auto max-h-[70vh] whitespace-pre"
      ><code>{{ yaml }}</code></pre>

      <p class="text-xs text-ui-muted text-pretty">
        <template v-if="isDefaultConfig">
          These are the defaults, so you don’t need a config file. Change any
          setting to customize it.
        </template>
        <template v-else>
          Commit this file to your default branch. Only the settings you changed
          are included.
        </template>
      </p>
    </aside>
  </div>
</template>
