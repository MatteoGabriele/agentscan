<script setup lang="ts">
import type {
  FlagDataPoint,
  GitHubEvent,
  IdentifyResult,
} from "@unveil/identity";
import dayjs from "dayjs";

type Flag = IdentifyResult["flags"][number];

const props = defineProps<{ flag: Flag }>();

const isExpanded = ref(false);
const areEventsExpanded = ref(false);

function toggleExpanded() {
  if (props.flag.data.length) isExpanded.value = !isExpanded.value;
}

function toggleEvents() {
  areEventsExpanded.value = !areEventsExpanded.value;
}

const EVENT_PREVIEW_COUNT = 5;

const visibleEvents = computed(() =>
  areEventsExpanded.value
    ? props.flag.events
    : props.flag.events.slice(0, EVENT_PREVIEW_COUNT),
);

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

function groupDataPoints(
  data: FlagDataPoint[],
): { icon: string; points: FlagDataPoint[] }[] {
  const groups: { icon: string; points: FlagDataPoint[] }[] = [];
  for (const point of data) {
    const icon = getDataPointIcon(point.label);
    const last = groups[groups.length - 1];
    if (last && last.icon === icon) {
      last.points.push(point);
    } else {
      groups.push({ icon, points: [point] });
    }
  }
  return groups;
}

function getEventIcon(event: GitHubEvent): string {
  switch (event.type) {
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
        (payload?.size as number) ??
        (payload?.commits as unknown[])?.length ??
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

function groupEvents(
  events: GitHubEvent[],
): { icon: string; events: GitHubEvent[] }[] {
  const groups: { icon: string; events: GitHubEvent[] }[] = [];
  for (const ev of events) {
    const icon = getEventIcon(ev);
    const last = groups[groups.length - 1];
    if (last && last.icon === icon) {
      last.events.push(ev);
    } else {
      groups.push({ icon, events: [ev] });
    }
  }
  return groups;
}

const ZERO_SHA = "0000000000000000000000000000000000000000";

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
      if (after && after !== ZERO_SHA) {
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
  <li class="not-last:border-b border-gh-border-light/40 py-4">
    <button class="flex items-center gap-1 mb-1" @click="toggleExpanded">
      <h4 class="font-mono">{{ flag.label }}</h4>
      <span
        v-if="flag.data.length"
        class="i-lucide:chevron-down text-sm text-gh-muted transition-transform mt-0.5 shrink-0"
        :class="isExpanded && 'rotate-180'"
      />
    </button>
    <p class="text-gh-muted text-sm">{{ flag.detail }}</p>

    <template v-if="flag.data.length">
      <div
        v-if="isExpanded"
        class="mt-3 pt-3 border-t border-gh-border-light/30 space-y-2"
      >
        <div
          v-for="group in groupDataPoints(flag.data)"
          :key="group.icon"
          class="flex gap-2"
        >
          <span
            :class="group.icon"
            class="text-xs text-gh-muted shrink-0 sticky top-4 self-start mt-1"
          />
          <div class="flex-1 space-y-3">
            <div
              v-for="point in group.points"
              :key="point.label"
              class="flex flex-col gap-0.5"
            >
              <span class="text-gh-muted text-m">{{
                parseDataPoint(point).label
              }}</span>
              <div class="flex items-center gap-1">
                <template v-if="typeof point.value === 'boolean'">
                  <span
                    :class="
                      point.value
                        ? 'i-lucide:check text-green-500'
                        : 'i-lucide:x text-gh-muted'
                    "
                    class="text-xs"
                  />
                </template>
                <span
                  v-else
                  class="text-sm"
                  :class="
                    isExceeded(point) ? 'text-gh-danger-hover' : 'text-gh-text'
                  "
                >
                  {{ parseDataPoint(point).displayValue }}
                </span>
                <span
                  v-if="parseDataPoint(point).displayThreshold !== undefined"
                  class="text-gh-muted text-sm"
                >
                  / {{ parseDataPoint(point).displayThreshold }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <template v-if="flag.events.length">
          <p
            class="text-gh-muted text-xs pt-2 pb-1 border-t border-gh-border-light/20"
          >
            Evidence
          </p>
          <div
            v-for="group in groupEvents(visibleEvents)"
            :key="group.icon"
            class="flex gap-2"
          >
            <span
              :class="group.icon"
              class="text-xs text-gh-muted shrink-0 sticky top-4 self-start mt-1"
            />
            <div class="flex-1 space-y-3">
              <div
                v-for="(ev, i) in group.events"
                :key="i"
                class="flex flex-col gap-0.5"
              >
                <a
                  v-if="getEventUrl(ev)"
                  :href="getEventUrl(ev)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-gh-text text-sm hover:underline"
                >
                  {{ getEventDescription(ev) }}
                </a>
                <span v-else class="text-gh-text text-sm">
                  {{ getEventDescription(ev) }}
                </span>
                <div class="flex gap-2 text-gh-muted text-xs">
                  <span>{{ ev.repo?.name }}</span>
                  <span>{{ formatEventTime(ev.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            v-if="flag.events.length > EVENT_PREVIEW_COUNT"
            class="text-gh-muted text-xs hover:text-gh-text transition-colors"
            @click="toggleEvents"
          >
            {{
              areEventsExpanded
                ? "Show less"
                : `Show ${flag.events.length - EVENT_PREVIEW_COUNT} more`
            }}
          </button>
        </template>
      </div>
    </template>
  </li>
</template>
