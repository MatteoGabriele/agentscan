<script setup lang="ts">
import { identityConfig } from "@unveil/identity";
import dayjs from "dayjs";

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

const verifiedAutomation = computed<VerifiedAutomation | undefined>(() => {
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

const identifyAnalysis = computed<IdentifyReplicantResult | undefined>(() => {
  return data.value?.analysis;
});

const score = computed<number | undefined>(() => {
  return data.value?.analysis.score;
});

const { nearestClassification } = useNearestClassification(score);

useSeoAnalysis(identifyAnalysis, {
  hasCommunityFlag,
  hasActivityReport,
});
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
                v-if="nearestClassification"
                class="flex items-center gap-2 text-sm text-gh-muted mb-2"
              >
                <span class="i-lucide:megaphone text-xs"></span>
                <span class="text-pretty line-height-none">
                  Activity close to {{ nearestClassification }} signals.
                </span>
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
          class="mt-4 pt-4 border-t border-gh-border-light"
        >
          <p
            class="flex gap-2 items-center mb-2 text-gh-danger-hover font-mono text-base"
          >
            Community flagged
          </p>
          <p class="text-gh-text text-sm mb-2">
            {{ verifiedAutomation.reason }}
          </p>
          <footer class="flex items-baseline justify-between">
            <p class="text-gh-muted text-xs">Flagged {{ flagCreatedAt }}</p>
            <NuxtLink
              :to="verifiedAutomation.issueUrl"
              target="_blank"
              external
              class="text-gh-danger-hover underline inline text-xs"
            >
              View issue
            </NuxtLink>
          </footer>
        </section>

        <section v-else class="mt-4 pt-4 border-t border-gh-border-light">
          <p class="text-gh-muted text-sm">
            Have thoughts about this account? Let the community know.
          </p>
          <NuxtLink
            :to="flagAccountUrl"
            target="_blank"
            external
            class="underline inline text-xs"
          >
            Share your thoughts
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
          class="not-last:border-b border-gh-border-light py-4 @md:py-2"
        >
          <h4 class="font-mono">{{ flag.label }}</h4>
          <p class="text-gh-muted">
            {{ flag.detail }}
          </p>
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
