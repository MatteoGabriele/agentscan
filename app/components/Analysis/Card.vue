<script setup lang="ts">
import type {
  GitHubEvent,
  GitHubUser,
  IdentityClassification,
  IdentifyResult,
} from "@unveil/identity";

type FlagDataPoint = IdentifyResult["flags"][number]["data"][number];
import dayjs from "dayjs";

function getDataPointIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("branch")) return "i-lucide:git-branch";
  if (l.includes("fork")) return "i-lucide:git-fork";
  if (l.includes("merge") || l.includes("merged")) return "i-lucide:git-merge";
  if (l.includes("pr") || l.includes("pull request"))
    return "i-lucide:git-pull-request";
  if (l.includes("closed")) return "i-lucide:git-pull-request-closed";
  if (l.includes("star") || l.includes("watch")) return "i-lucide:star";
  if (l.includes("comment")) return "i-lucide:message-square";
  if (l.includes("push")) return "i-lucide:upload";
  if (l.includes("repo")) return "i-lucide:folder-git-2";
  if (l.includes("bounty")) return "i-lucide:trophy";
  if (l.includes("ratio") || l.includes("%")) return "i-lucide:percent";
  if (l.includes("entropy") || l.includes("diversity") || l.includes("types"))
    return "i-lucide:layers";
  if (l.includes("age") || l.includes("date")) return "i-lucide:calendar";
  if (
    l.includes("hour") ||
    l.includes("interval") ||
    l.includes("gap") ||
    l.includes("window") ||
    l.includes("span") ||
    l.includes("(s)") ||
    l.includes("(min)")
  )
    return "i-lucide:timer";
  if (l.includes("consecutive") || l.includes("rapid") || l.includes("burst"))
    return "i-lucide:zap";
  if (l.includes("event") || l.includes("activity")) return "i-lucide:activity";
  return "i-lucide:bar-chart-2";
}

function isExceeded(point: FlagDataPoint): boolean {
  if (point.threshold === undefined) return false;
  const v = parseFloat(String(point.value).replace("%", ""));
  const t = parseFloat(String(point.threshold).replace("%", ""));
  return !isNaN(v) && !isNaN(t) && v > t;
}

function parseDataPoint(point: FlagDataPoint): {
  label: string;
  displayValue: string;
  displayThreshold: string | undefined;
} {
  const unitMatch = point.label.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (!unitMatch) {
    return {
      label: point.label,
      displayValue: String(point.value),
      displayThreshold:
        point.threshold !== undefined ? String(point.threshold) : undefined,
    };
  }

  const [, cleanLabel, unit] = unitMatch as [string, string, string];
  const withUnit = (val: FlagDataPoint["value"]) => {
    if (typeof val === "boolean") return String(val);
    const n = parseFloat(String(val));
    return !isNaN(n) ? `${val}${unit}` : String(val);
  };

  return {
    label: cleanLabel,
    displayValue: withUnit(point.value),
    displayThreshold:
      point.threshold !== undefined ? withUnit(point.threshold) : undefined,
  };
}

function getEventIcon(type: string | null | undefined): string {
  switch (type) {
    case "PullRequestEvent":
      return "i-lucide:git-pull-request";
    case "PushEvent":
      return "i-lucide:upload";
    case "CreateEvent":
      return "i-lucide:git-branch";
    case "DeleteEvent":
      return "i-lucide:trash-2";
    case "ForkEvent":
      return "i-lucide:git-fork";
    case "WatchEvent":
      return "i-lucide:star";
    case "IssueCommentEvent":
    case "PullRequestReviewCommentEvent":
      return "i-lucide:message-square";
    case "IssuesEvent":
      return "i-lucide:circle-dot";
    case "PullRequestReviewEvent":
      return "i-lucide:eye";
    case "ReleaseEvent":
      return "i-lucide:tag";
    case "CommitCommentEvent":
      return "i-lucide:message-circle";
    case "MemberEvent":
      return "i-lucide:user-plus";
    default:
      return "i-lucide:activity";
  }
}

function getEventDescription(event: GitHubEvent): string {
  const payload = event.payload as Record<string, unknown> | undefined;

  switch (event.type) {
    case "PullRequestEvent": {
      const action = payload?.action as string | undefined;
      const pr = payload?.pull_request as { number?: number } | undefined;
      return pr?.number
        ? `PR #${pr.number} ${action ?? ""}`.trim()
        : `Pull request ${action ?? ""}`.trim();
    }
    case "PushEvent": {
      const commits =
        (payload?.commits as unknown[])?.length ??
        (payload?.size as number) ??
        0;
      const ref = (payload?.ref as string)?.replace("refs/heads/", "") ?? "";
      return ref
        ? `${commits} commit${commits !== 1 ? "s" : ""} → ${ref}`
        : `${commits} commit${commits !== 1 ? "s" : ""}`;
    }
    case "CreateEvent": {
      const refType = payload?.ref_type as string | undefined;
      const ref = payload?.ref as string | undefined;
      return ref ? `${refType} created: ${ref}` : `${refType ?? "ref"} created`;
    }
    case "DeleteEvent": {
      const refType = payload?.ref_type as string | undefined;
      const ref = payload?.ref as string | undefined;
      return ref ? `${refType} deleted: ${ref}` : `${refType ?? "ref"} deleted`;
    }
    case "ForkEvent": {
      const forkee = payload?.forkee as { full_name?: string } | undefined;
      return forkee?.full_name ? `forked → ${forkee.full_name}` : "forked";
    }
    case "WatchEvent":
      return "starred";
    case "IssueCommentEvent": {
      const issue = payload?.issue as { number?: number } | undefined;
      return issue?.number ? `comment on #${issue.number}` : "issue comment";
    }
    case "IssuesEvent": {
      const action = payload?.action as string | undefined;
      const issue = payload?.issue as { number?: number } | undefined;
      return issue?.number
        ? `issue #${issue.number} ${action ?? ""}`.trim()
        : `issue ${action ?? ""}`.trim();
    }
    case "PullRequestReviewEvent": {
      const pr = payload?.pull_request as { number?: number } | undefined;
      return pr?.number ? `reviewed PR #${pr.number}` : "PR review";
    }
    case "PullRequestReviewCommentEvent": {
      const pr = payload?.pull_request as { number?: number } | undefined;
      return pr?.number ? `comment on PR #${pr.number}` : "PR comment";
    }
    case "ReleaseEvent": {
      const release = payload?.release as { tag_name?: string } | undefined;
      return release?.tag_name ? `released ${release.tag_name}` : "release";
    }
    default:
      return event.type?.replace("Event", "") ?? "event";
  }
}

function formatEventTime(date: string | null | undefined): string {
  if (!date) return "";
  return dayjs(date).format("MMM D, h:mma");
}

const props = defineProps<{
  user: GitHubUser;
}>();

const username = computed<string | undefined | null>(() => props.user.login);

const analysisKey = computed<string>(() => `analysis:${username.value}`);
const { data, status, error } = useFetch(
  () => `/api/identify-replicant/${username.value}`,
  {
    query: {
      created_at: props.user.created_at,
      repos_count: props.user.public_repos,
      pages: 2,
      show_events: true,
    },
    key: analysisKey,
    watch: [username],
    lazy: true,
  },
);

const { data: verifiedAutomations } = useVerifiedAutomations();

const verifiedAutomation = computed(() => {
  return verifiedAutomations.value?.find((account) => {
    return (
      account.username.toLowerCase() === username.value?.toLowerCase() ||
      account.id === props.user.id
    );
  });
});

const { data: integrations } = useIntegrations();
const activityReport = computed<IntegrationItem | undefined>(() => {
  return integrations.value?.find((item) => {
    return item.username.toLowerCase() === username.value?.toLowerCase();
  });
});

const hasActivityReport = computed<boolean>(() => !!activityReport.value);
const hasCommunityFlag = computed<boolean>(() => !!verifiedAutomation.value);

const flagCreatedAt = computed<string | undefined>(() => {
  if (!verifiedAutomation.value) {
    return;
  }

  return dayjs(verifiedAutomation.value.createdAt).format("MMM D, YYYY");
});

const classification = computed<IdentityClassification | undefined>(() => {
  return data.value?.analysis.classification;
});

const { classificationDetails } = useClassificationDetails(classification);

type ScoreStyle = {
  text: string;
  border: string;
};

const scoreStyle = computed<ScoreStyle>(() => {
  if (hasCommunityFlag.value) {
    return {
      text: "text-gh-danger-hover",
      border: "border-gh-danger-hover",
    };
  }

  if (!classification.value) {
    return {
      text: "text-gray-500",
      border: "border-gray-500",
    };
  }

  if (classification.value === "automation") {
    return {
      text: "text-gh-danger-hover",
      border: "border-gh-danger-hover",
    };
  }

  if (classification.value === "mixed" || hasActivityReport.value) {
    return {
      text: "text-amber-500",
      border: "border-amber-500",
    };
  }

  return {
    text: "text-green-500",
    border: "border-green-500",
  };
});

const classificationIcon = computed<string>(() => {
  if (classification.value === "organic") {
    return "i-lucide:heart-handshake";
  }

  if (classification.value === "mixed") {
    return "i-lucide:blend";
  }

  return "i-lucide:shield-alert";
});

const flagAccountUrl = computed<string>(() => {
  const baseUrl = "https://github.com/MatteoGabriele/agentscan/issues/new";
  const params = new URLSearchParams({
    template: "report-automated-account.yml",
    title: `[AUTOMATION] ${username.value}`,
    username: username.value || "",
    "user-id": props.user.id.toString(),
  });
  return `${baseUrl}?${params.toString()}`;
});

const identifyAnalysis = computed<IdentifyResult | undefined>(() => {
  return data.value?.analysis;
});

const score = computed<number | undefined>(() => {
  return data.value?.analysis.score;
});

const isBountyHunter = computed<boolean>(() => {
  return !!data.value?.analysis.isBountyHunter;
});

const { nearestClassification } = useNearestClassification(score);

const warnings = computed<string[]>(() => {
  const list: string[] = [];

  if (nearestClassification.value) {
    list.push(`Activity close to ${nearestClassification.value} signals.`);
  }

  if (isBountyHunter.value) {
    list.push("Possible bounty activity.");
  }

  return list;
});

useSeoAnalysis(identifyAnalysis, {
  hasCommunityFlag,
  hasActivityReport,
});

const expandedFlags = ref<string[]>([]);
const expandedFlagEvents = ref<string[]>([]);

function toggleFlag(label: string) {
  const idx = expandedFlags.value.indexOf(label);
  if (idx === -1) {
    expandedFlags.value.push(label);
  } else {
    expandedFlags.value.splice(idx, 1);
  }
}

function isFlagExpanded(label: string) {
  return expandedFlags.value.includes(label);
}

function toggleFlagEvents(label: string) {
  const idx = expandedFlagEvents.value.indexOf(label);
  if (idx === -1) {
    expandedFlagEvents.value.push(label);
  } else {
    expandedFlagEvents.value.splice(idx, 1);
  }
}

function areFlagEventsExpanded(label: string) {
  return expandedFlagEvents.value.includes(label);
}

const EVENT_PREVIEW_COUNT = 5;

function visibleEvents(flag: IdentifyResult["flags"][number]) {
  return areFlagEventsExpanded(flag.label)
    ? flag.events
    : flag.events.slice(0, EVENT_PREVIEW_COUNT);
}

function getEventUrl(event: GitHubEvent): string | undefined {
  const repo = event.repo?.name;
  const payload = event.payload as Record<string, unknown> | undefined;
  if (!repo) return undefined;
  const base = `https://github.com/${repo}`;

  switch (event.type) {
    case "PullRequestEvent":
    case "PullRequestReviewEvent":
    case "PullRequestReviewCommentEvent": {
      const pr = payload?.pull_request as { number?: number } | undefined;
      return pr?.number ? `${base}/pull/${pr.number}` : undefined;
    }
    case "PushEvent": {
      const after = payload?.after as string | undefined;
      if (after && after !== "0000000000000000000000000000000000000000") {
        return `${base}/commit/${after}`;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}
</script>

<template>
  <AnalysisCardSkeleton v-if="status === 'pending'" />
  <ErrorCardGeneric :error v-else-if="error" />
  <template v-else-if="data">
    <div
      class="flex gap-6 bg-gh-card p-6 rounded-2 border-2 border-solid flex-col @lg:flex-row"
      :class="scoreStyle.border"
    >
      <div class="w-full">
        <header class="flex items-center justify-between mb-2">
          <div class="w-full">
            <div class="mb-2 flex flex-col">
              <div
                v-if="warnings.length"
                class="flex items-start gap-2 text-sm text-gh-muted mb-2"
              >
                <span class="i-lucide:megaphone text-xs shrink-0"></span>
                <ul class="flex flex-col gap-1">
                  <li
                    v-for="(warning, i) in warnings"
                    :key="i"
                    class="text-pretty line-height-none"
                  >
                    {{ warning }}
                  </li>
                </ul>
              </div>

              <span class="flex gap-2 items-center" :class="scoreStyle.text">
                <span :class="classificationIcon" class="text-base" />
                <h3 class="text-xl font-mono">
                  {{ classificationDetails.label }}
                </h3>
              </span>
            </div>
            <p class="mt-1 text-gh-text">
              {{ classificationDetails.description }}
            </p>
          </div>
        </header>

        <div class="text-sm text-gh-muted">
          <p v-if="data.eventsCount > 0">
            Analyzed from the last {{ data.eventsCount }} public GitHub
            <NuxtLink
              external
              target="_blank"
              class="underline"
              :to="`https://api.github.com/users/${username}/events?per_page=100`"
            >
              events
            </NuxtLink>
          </p>
          <p v-else>
            No recent
            <NuxtLink
              external
              target="_blank"
              class="underline"
              :to="`https://api.github.com/users/${username}/events?per_page=100`"
            >
              events</NuxtLink
            >
            from this account
          </p>
        </div>

        <section
          v-if="verifiedAutomation"
          class="mt-4 pt-4 border-t border-gh-border-light/40"
        >
          <p
            class="flex gap-2 items-center mb-2 text-gh-muted font-mono text-base"
          >
            Community reported
          </p>
          <p class="text-gh-text text-sm mb-2">
            {{ verifiedAutomation.reason }}
          </p>
          <footer class="flex items-baseline justify-between">
            <p class="text-gh-muted text-xs">Reported {{ flagCreatedAt }}</p>
            <NuxtLink
              :to="verifiedAutomation.issueUrl"
              target="_blank"
              external
              class="text-gh-muted underline inline text-xs"
            >
              View issue
            </NuxtLink>
          </footer>
        </section>

        <section v-else class="mt-4 pt-4 border-t border-gh-border-light">
          <p class="text-gh-muted text-sm">
            Know something about this account? Help the community.
          </p>
          <NuxtLink
            :to="flagAccountUrl"
            target="_blank"
            external
            class="underline inline text-xs"
          >
            Add report
          </NuxtLink>
        </section>
      </div>
    </div>

    <div
      v-if="data.analysis.flags.length > 0 || hasActivityReport"
      class="bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border"
    >
      <h3 class="mb-4 text-gh-text text-xl font-mono">Activity Signals</h3>
      <ul>
        <li
          v-for="flag in data.analysis.flags"
          :key="flag.label"
          class="not-last:border-b border-gh-border-light/40 py-4"
        >
          <button
            class="flex items-center gap-1 mb-1"
            @click="flag.data.length ? toggleFlag(flag.label) : undefined"
          >
            <h4 class="font-mono">{{ flag.label }}</h4>
            <span
              v-if="flag.data.length"
              class="i-lucide:chevron-down text-sm text-gh-muted transition-transform mt-0.5 shrink-0"
              :class="isFlagExpanded(flag.label) && 'rotate-180'"
            />
          </button>
          <p class="text-gh-muted text-sm">{{ flag.detail }}</p>

          <template v-if="flag.data.length">
            <div
              v-if="isFlagExpanded(flag.label)"
              class="mt-3 pt-3 border-t border-gh-border-light/30 space-y-2"
            >
              <div
                v-for="point in flag.data"
                :key="point.label"
                class="flex items-center gap-2"
              >
                <span
                  :class="getDataPointIcon(point.label)"
                  class="text-xs text-gh-muted shrink-0"
                />
                <span class="text-gh-muted text-xs flex-1">{{
                  parseDataPoint(point).label
                }}</span>
                <template v-if="typeof point.value === 'boolean'">
                  <span
                    :class="
                      point.value
                        ? 'i-lucide:check text-green-500'
                        : 'i-lucide:x text-gh-muted'
                    "
                    class="text-sm shrink-0"
                  />
                </template>
                <span
                  v-else
                  class="font-mono font-semibold text-xs shrink-0"
                  :class="
                    isExceeded(point) ? 'text-gh-danger-hover' : 'text-gh-text'
                  "
                >
                  {{ parseDataPoint(point).displayValue }}
                </span>
                <span
                  v-if="parseDataPoint(point).displayThreshold !== undefined"
                  class="text-gh-muted text-xs shrink-0"
                >
                  / {{ parseDataPoint(point).displayThreshold }}
                </span>
              </div>

              <template v-if="flag.events.length">
                <p
                  class="text-gh-muted text-xs pt-2 pb-1 border-t border-gh-border-light/20"
                >
                  Evidence
                </p>
                <div
                  v-for="(ev, i) in visibleEvents(flag)"
                  :key="i"
                  class="flex items-center gap-2"
                >
                  <span
                    :class="getEventIcon(ev.type)"
                    class="text-xs text-gh-muted shrink-0"
                  />
                  <a
                    v-if="getEventUrl(ev)"
                    :href="getEventUrl(ev)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gh-text text-xs flex-1 truncate hover:underline"
                  >
                    {{ getEventDescription(ev) }}
                  </a>
                  <span v-else class="text-gh-text text-xs flex-1 truncate">
                    {{ getEventDescription(ev) }}
                  </span>
                  <span
                    class="text-gh-muted text-xs shrink-0 truncate max-w-32"
                  >
                    {{ ev.repo?.name }}
                  </span>
                  <span class="text-gh-muted text-xs shrink-0">
                    {{ formatEventTime(ev.created_at) }}
                  </span>
                </div>
                <button
                  v-if="flag.events.length > EVENT_PREVIEW_COUNT"
                  class="text-gh-muted text-xs hover:text-gh-text transition-colors"
                  @click="toggleFlagEvents(flag.label)"
                >
                  {{
                    areFlagEventsExpanded(flag.label)
                      ? "Show less"
                      : `Show ${flag.events.length - EVENT_PREVIEW_COUNT} more`
                  }}
                </button>
              </template>
            </div>
          </template>
        </li>
      </ul>

      <ExternalAnlysisCard
        v-if="activityReport"
        :items="[activityReport]"
        class="mt-4"
      />
    </div>

    <ChartAccountEventsTimeline
      :classification="data.analysis.classification"
      :events="data.events"
    />
  </template>
</template>
