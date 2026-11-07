<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import type { ActionReleasesResponse } from '~~/shared/types/action-release'
import {
  buildDefaultFirstTimeHoneypotGreeting,
  buildDefaultHoneypotGreeting,
  getDefaultMessages,
} from '~~/shared/utils/agentscan-messages'
import {
  AUTO_CLOSE_OPTIONS,
  buildActionWorkflow,
  buildAppConfig,
  CUSTOMIZABLE_MESSAGES,
  DEFAULT_AUTO_CLOSE_CLASSIFICATIONS,
  DEFAULT_LABELS,
  type AuthorAssociation,
  type Classification,
  type ConfigSettings,
  type LabelledClassification,
  type Platform,
  type ScanMode,
} from '~~/shared/utils/agentscan-config'

const platforms: { value: Platform; label: string; icon: string }[] = [
  { value: 'app', label: 'GitHub App', icon: 'i-lucide:github' },
  { value: 'action', label: 'GitHub Action', icon: 'i-lucide:workflow' },
]

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
  { label: string; when: string; dot: string }
> = {
  automation: {
    label: 'Automation',
    when: 'The account’s activity looks automated.',
    dot: 'bg-ui-automation',
  },
  mixed: {
    label: 'Mixed',
    when: 'Some activity looks automated, some looks human.',
    dot: 'bg-ui-mixed',
  },
  'community-flagged': {
    label: 'Community-flagged',
    when: 'The account is on the community list of verified automated accounts. This replaces the analysis result.',
    dot: 'bg-ui-destructive',
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

function isLabelled(
  classification: Classification,
): classification is LabelledClassification {
  return classification in DEFAULT_LABELS.app
}

const platform = ref<Platform>('app')
const mode = ref<ScanMode>('full')
const scanPullRequests = ref(true)
const scanIssues = ref(false)
const allowedUsersList = ref<string[]>([])
const newAllowedUser = ref('')
const trustedAuthorAssociations = ref<AuthorAssociation[]>([])
const commentOnOrganic = ref(false)
const autoClose = ref(false)
const autoCloseClassifications = ref<Classification[]>([
  ...DEFAULT_AUTO_CLOSE_CLASSIFICATIONS,
])
const honeypot = ref(false)
const cache = ref(false)

const labels = reactive({ ...DEFAULT_LABELS.app })

// Labels still on the previous platform's default switch to the new one's default.
watch(platform, (current, previous) => {
  for (const key of Object.keys(labels) as LabelledClassification[]) {
    if (labels[key] === DEFAULT_LABELS[previous][key]) {
      labels[key] = DEFAULT_LABELS[current][key]
    }
  }
})

// Community-flagged accounts are always closed when auto-close is on, so they are not an option.
const autoCloseOptions = computed(() =>
  classifications.filter((item) =>
    AUTO_CLOSE_OPTIONS[platform.value].includes(item.value),
  ),
)

const pickedAutoCloseOptions = computed(() =>
  autoCloseOptions.value.filter((item) =>
    autoCloseClassifications.value.includes(item.value),
  ),
)

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
const activeLabel = computed(() =>
  isLabelled(activeTab.value) ? activeTab.value : null,
)
const isActiveMessageCustomizable = computed(() =>
  CUSTOMIZABLE_MESSAGES[platform.value].includes(activeTab.value),
)
const tabsId = useId()

function isCustomized(classification: Classification) {
  const hasCustomMessage =
    messages[classification] !== '' &&
    CUSTOMIZABLE_MESSAGES[platform.value].includes(classification)

  return (
    hasCustomMessage ||
    (isLabelled(classification) &&
      labels[classification] !== DEFAULT_LABELS[platform.value][classification])
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

const settings = computed<ConfigSettings>(() => ({
  mode: mode.value,
  scanPullRequests: scanPullRequests.value,
  scanIssues: scanIssues.value,
  allowedUsers: allowedUsersList.value,
  trustedAuthorAssociations: trustedAuthorAssociations.value,
  commentOnOrganic: commentOnOrganic.value,
  autoClose: autoClose.value,
  autoCloseClassifications: autoCloseClassifications.value,
  honeypot: honeypot.value,
  cache: cache.value,
  labels,
  messages,
  messageHoneypot: messageHoneypot.value,
  messageHoneypotFirstTime: messageHoneypotFirstTime.value,
}))

// Latest action releases, fetched once the action platform is selected.
const {
  data: releases,
  status: releasesStatus,
  execute: fetchReleases,
} = useLazyFetch<ActionReleasesResponse>('/api/action-releases', {
  immediate: false,
  server: false,
})

watch(platform, (current) => {
  if (current === 'action' && releasesStatus.value === 'idle') {
    fetchReleases()
  }
})

const output = computed(() => {
  if (platform.value === 'app') {
    return buildAppConfig(settings.value)
  }

  return releases.value
    ? buildActionWorkflow(settings.value, releases.value)
    : ''
})

const outputPath = computed(() =>
  platform.value === 'app'
    ? '.github/agentscan.yml'
    : '.github/workflows/agentscan.yml',
)

const isDefaultConfig = computed(
  () => platform.value === 'app' && output.value.trim() === 'version: 1',
)

const defaultHoneypotGreeting = computed(() =>
  buildDefaultHoneypotGreeting({
    username: '{username}',
    subject: '{type}',
    isPR: scanPullRequests.value,
  })
    .join('\n')
    .trim(),
)

// Blank first-time greeting falls back to the custom regular greeting, then the built-in one.
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

const { copy, copied } = useClipboard({ source: output })
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
    <form class="flex flex-col gap-6 min-w-0" @submit.prevent>
      <fieldset class="flex flex-col gap-2">
        <legend class="sr-only">Generate the configuration for</legend>
        <div
          class="grid grid-cols-2 gap-1 p-1 rounded-2 bg-ui-muted/10 sm:max-w-sm"
        >
          <label
            v-for="item in platforms"
            :key="item.value"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ui-accent/40"
            :class="
              platform === item.value
                ? 'bg-ui-bg text-ui-text font-medium shadow-sm'
                : 'text-ui-muted hover:text-ui-text'
            "
          >
            <input
              v-model="platform"
              type="radio"
              name="platform"
              :value="item.value"
              class="sr-only"
            />
            <span :class="item.icon" aria-hidden="true" />
            {{ item.label }}
          </label>
        </div>
        <p class="text-sm text-ui-muted text-pretty">
          <template v-if="platform === 'app'">
            A config file for the installed GitHub App. Without one, the app
            runs on its defaults.
          </template>
          <template v-else>
            A workflow that runs the GitHub Action, pinned to its latest
            release.
          </template>
        </p>
      </fieldset>

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
          <AppConfigCheckbox
            v-if="platform === 'action'"
            v-model="cache"
            label="Cache results between runs"
            hint="Reuses an author’s analysis for 2 days, so repeat contributors cost fewer API calls. Adds an actions/cache step to the workflow."
          />
          <p
            v-if="platform === 'action' && cache"
            class="flex items-start gap-1.5 pl-6.5 text-xs text-ui-text/80 text-pretty"
          >
            <span
              class="i-lucide:triangle-alert shrink-0 mt-0.5 text-ui-mixed"
              aria-hidden="true"
            />
            <span>
              A cached result doesn’t change until it expires. A new account
              that has only just started behaving like automation may not show
              enough signals yet, so it can be cached as organic and keep that
              result for up to 2 days, even as the evidence piles up. The same
              goes for an account the community flags after it was cached.
            </span>
          </p>
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
            are recognized automatically.
            <template v-if="platform === 'app'">
              Usernames must match exactly, including capitalization.
            </template>
            <template v-else>Capitalization doesn’t matter.</template>
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
              class="flex items-start gap-2.5 p-3 rounded border transition-colors"
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
                class="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border text-sm transition-colors"
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
              <template v-if="pickedAutoCloseOptions.length === 0">
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
              <template v-if="isCustomized(item.value)">
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

            <p v-if="!activeLabel" class="text-sm text-ui-muted">
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
                v-model="labels[activeLabel]"
                type="text"
                aria-label="Label name"
                :placeholder="DEFAULT_LABELS[platform][activeLabel]"
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
                v-if="isActiveMessageCustomizable"
                v-model="messages[activeTab]"
                :default-message="defaultMessages[activeTab]"
              />
              <div
                v-else
                class="rounded border border-dashed border-ui-border/60 px-3 py-2.5"
              >
                <p class="text-xs font-medium text-ui-muted">
                  Always sent. The GitHub Action can’t change this one.
                </p>
                <p class="mt-1.5 text-sm font-mono text-ui-text/90">
                  {{ defaultMessages[activeTab] }}
                </p>
              </div>
            </AppConfigField>
          </div>
        </div>
      </AppConfigSection>

      <AppConfigSection
        title="Honeypot"
        icon="i-lucide:fishing-hook"
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
          <p
            v-if="honeypot && platform === 'action'"
            class="flex items-start gap-1.5 mt-1.5 pl-6.5 text-xs text-ui-muted"
          >
            <span class="i-lucide:info shrink-0 mt-0.5" aria-hidden="true" />
            The workflow also runs on new comments, so it can see the reply.
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
        <p class="text-sm font-mono text-ui-muted truncate">{{ outputPath }}</p>
        <button
          type="button"
          class="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-ui-border/60 hover:bg-ui-muted/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          :disabled="!output"
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
        v-if="output"
        class="px-4 py-3 bg-ui-card border border-ui-border/60 rounded text-sm text-ui-text font-mono overflow-auto max-h-[70vh] whitespace-pre"
      ><code>{{ output }}</code></pre>
      <p
        v-else-if="releasesStatus === 'error'"
        class="px-4 py-3 border border-ui-border/60 rounded text-sm text-ui-destructive"
        role="alert"
      >
        Couldn’t look up the latest release of the GitHub Action.
        <button
          type="button"
          class="underline hover:text-ui-text"
          @click="fetchReleases()"
        >
          Try again
        </button>
      </p>
      <p
        v-else
        class="px-4 py-3 border border-ui-border/60 rounded text-sm text-ui-muted"
        aria-live="polite"
      >
        Looking up the latest release…
      </p>

      <p class="text-xs text-ui-muted text-pretty">
        <template v-if="platform === 'action'">
          <template v-if="releases">
            Pinned to the commit of
            <NuxtLink
              :to="releases.agentscan.url"
              external
              target="_blank"
              class="underline hover:text-ui-text"
            >
              {{ releases.agentscan.tag }}</NuxtLink
            >, the latest release. Only the inputs you changed are included.
          </template>
        </template>
        <template v-else-if="isDefaultConfig">
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
