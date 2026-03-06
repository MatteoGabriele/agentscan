<script setup lang="ts">
import dayjs from "dayjs";
import { CONFIG } from "~~/shared/utils/voight-kampff-test/config";

const route = useRoute();
const router = useRouter();

const accountName = computed(() => {
  if (!route.params.name) {
    return "";
  }

  if (typeof route.params.name === "string") {
    return route.params.name;
  }

  return route.params.name[0] ?? "";
});

const formInput = ref(accountName.value);

const { data: user, error } = await useFetch(
  () => `/api/account/${accountName.value}`,
  {
    key: `account:${accountName.value}`,
    watch: [accountName],
  },
);

const { data: analysis, status: analysisStatus } = useFetch(
  () => `/api/identify-replicant/${accountName.value}`,
  {
    query: {
      created_at: user.value?.created_at,
      repos_count: user.value?.public_repos,
    },
    key: `analysis:${accountName.value}`,
    watch: [accountName, user],
    lazy: true,
  },
);

async function handleSubmit(name: string) {
  await router.push({ name: "user-name", params: { name } });
}

const { data: verifiedAutomations, pending: verifiedAutomationsPending } =
  useVerifiedAutomations();

const verifiedAutomation = computed(() => {
  return verifiedAutomations.value?.find(
    (account) => account.username === accountName.value,
  );
});

const hasCommunityFlag = computed<boolean>(() => !!verifiedAutomation.value);

const flagCreatedAt = computed<string | undefined>(() => {
  if (!verifiedAutomation.value) {
    return;
  }

  return dayjs(verifiedAutomation.value.createdAt).format("MMM D, YYYY");
});

const score = computed<number>(() => {
  return analysis.value?.analysis.score ?? 0;
});

const scoreClasses = computed(() => {
  if (hasCommunityFlag.value) {
    return {
      text: "text-gh-danger",
      border: "border-gh-danger",
      bg: "bg-gh-danger",
    };
  }

  if (score.value >= CONFIG.THRESHOLD_HUMAN) {
    return {
      text: "text-green-500",
      border: "border-green-500",
      bg: "bg-green-500",
    };
  }

  if (score.value >= CONFIG.THRESHOLD_SUSPICIOUS) {
    return {
      text: "text-amber-500",
      border: "border-amber-500",
      bg: "bg-amber-500",
    };
  }

  return {
    text: "text-orange-500",
    border: "border-orange-500",
    bg: "bg-orange-500",
  };
});

const classificationDetails = computed(() => {
  if (score.value >= CONFIG.THRESHOLD_HUMAN) {
    return {
      label: "Organic activity",
      description: "No automation signals detected in the analyzed events.",
    };
  }

  if (score.value >= CONFIG.THRESHOLD_SUSPICIOUS) {
    return {
      label: "Mixed activity",
      description:
        "Activity patterns show a mix of organic and automated signals.",
    };
  }

  return {
    label: "Automation signals",
    description: "Activity patterns show signs of automation.",
  };
});

const classificationIcon = computed<string>(() => {
  if (score.value >= CONFIG.THRESHOLD_HUMAN) {
    return "i-carbon:growth";
  }

  if (score.value >= CONFIG.THRESHOLD_SUSPICIOUS) {
    return "i-carbon:activity";
  }

  return "i-carbon:meter-alt";
});

const ogTitle = computed(() => {
  if (!accountName.value) {
    return;
  }

  return `${accountName.value} | AgentScan`;
});

const ogDescription = computed(() => {
  if (!analysis.value) {
    return;
  }

  const label = classificationDetails.value.label;
  const flagsCounter = analysis.value.analysis.flags.length;

  let description = label;

  if (hasCommunityFlag.value) {
    description += ` | flagged by the community`;
  }

  if (flagsCounter > 0) {
    description += ` | ${flagsCounter} flags`;
  }

  return description;
});

const ogImage = computed(() => {
  if (!user.value) {
    return "/og.png";
  }

  return user.value.avatar_url;
});

useHead({
  title: ogTitle,
  meta: [
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "website" },
  ],
});
</script>

<template>
  <AnalyzeForm v-model="formInput" @submit="handleSubmit" />

  <div class="flex flex-col gap-6 @container">
    <!-- User Card -->
    <div
      v-if="user"
      class="flex flex-col @lg:flex-row justify-center items-center @lg:items-start gap-6 bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border"
    >
      <div class="size-40 @lg:size-20 rounded-full bg-gray-500 shrink-0">
        <img
          v-if="user.avatar_url"
          :src="user.avatar_url"
          :alt="`Avatar of ${user.login}`"
          class="size-40 @lg:size-20 rounded-full bg-gh-card"
        />
      </div>

      <div
        class="w-full flex flex-col justify-center items-center @lg:items-start text-center @lg:text-left"
      >
        <h2 class="text-gh-text text-3xl @lg:text-xl font-mono">
          {{ user.name || user.login }}
        </h2>
        <NuxtLink
          :external="true"
          target="_blank"
          :to="`https://github.com/${user.login}`"
          class="text-gh-muted underline text-xl @lg:text-sm"
        >
          @{{ user.login }}
        </NuxtLink>
        <p v-if="user.bio" class="my-2">
          {{ user.bio }}
        </p>
        <ul
          class="text-gh-muted mt-4 text-sm flex gap-2 sm:gap-4 flex-col items-center sm:flex-row @lg:items-start"
        >
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-user-multiple hidden @md:flex shrink-0"
              aria-hidden="true"
            />
            {{ user.followers }} followers
          </li>
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-repo-source-code hidden @md:flex shrink-0"
              aria-hidden="true"
            />
            <span v-if="user.public_repos === 0">No repos</span>
            <span v-else>{{ user.public_repos }} repos</span>
          </li>
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-calendar hidden @md:flex shrink-0"
              aria-hidden="true"
            />
            Member since
            <NuxtTime :datetime="user.created_at" date-style="medium" />
          </li>
        </ul>
      </div>
    </div>

    <!-- Analysis Loading State -->
    <div v-if="analysisStatus === 'pending'" class="flex flex-col gap-6">
      <!-- Classification Skeleton -->
      <div
        class="flex h-[140px] gap-6 bg-gh-card p-6 rounded-2 border-2 border-solid border-gh-border flex-col @lg:flex-row animate-pulse"
      >
        <div class="w-full">
          <div class="mb-4">
            <div class="h-6 bg-gh-border rounded w-1/3" />
          </div>
          <div class="space-y-4">
            <div class="h-3 bg-gh-border rounded w-5/6" />
            <div class="h-3 bg-gh-border rounded w-4/6" />
          </div>
        </div>
      </div>

      <!-- Flags Skeleton -->
      <div
        class="bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border animate-pulse flex justify-center"
      >
        <div class="h-6 bg-gh-border rounded w-1/2" />
      </div>
    </div>

    <!-- Error States -->
    <div
      v-else-if="error?.statusCode === 404"
      class="bg-gh-card p-6 rounded-2 border-2 border-solid border-gh-border text-center"
    >
      <span
        class="i-carbon:connection-signal-off text-4xl text-gh-muted mx-auto mb-4 block"
        aria-hidden="true"
      />
      <h3 class="text-xl font-mono text-gh-text mb-2">User not found</h3>
      <p class="text-gh-muted">Double-check the username and try again</p>
    </div>
    <div
      v-else-if="error"
      class="bg-gh-card p-6 rounded-2 border-2 border-solid border-gh-border text-center"
    >
      <span
        class="i-carbon:sailboat-offshore text-4xl text-gh-muted mx-auto mb-4 block"
        aria-hidden="true"
      />
      <h3 class="text-xl font-mono text-gh-text mb-2">Lost at sea</h3>
      <p class="text-gh-muted">
        {{ error.data?.message || "Failed to analyze user" }}
      </p>
    </div>

    <!-- Analysis Results -->
    <template v-else-if="analysis">
      <div
        class="flex gap-6 bg-gh-card p-6 rounded-2 border-2 border-solid flex-col @lg:flex-row"
        :class="scoreClasses.border"
      >
        <div class="w-full">
          <header class="flex items-center justify-between mb-2">
            <div>
              <span
                class="flex gap-2 items-center mb-2"
                :class="scoreClasses.text"
              >
                <span :class="classificationIcon" class="text-base" />
                <h3 class="text-xl font-mono">
                  {{ classificationDetails.label }}
                </h3>
              </span>
              <p class="mt-1 text-gh-text">
                {{ classificationDetails.description }}
              </p>
            </div>
          </header>
          <div class="text-sm text-gh-muted">
            <p v-if="analysis.eventsCount > 0">
              Analyzed from the last {{ analysis.eventsCount }} public GitHub
              <NuxtLink
                external
                target="_blank"
                class="underline"
                :to="`https://api.github.com/users/${user?.login}/events?per_page=100`"
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
                :to="`https://api.github.com/users/${user?.login}/events?per_page=100`"
              >
                events
              </NuxtLink>
              from this account
            </p>
          </div>

          <section
            v-if="verifiedAutomation"
            class="mt-4 pt-4 border-t border-gh-border-light"
          >
            <p
              class="flex gap-2 items-center mb-2 text-gh-danger font-mono text-base"
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
                class="text-gh-danger underline inline text-xs"
              >
                View issue
              </NuxtLink>
            </footer>
          </section>
        </div>
      </div>

      <div
        v-if="analysis.analysis.flags.length > 0"
        class="bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border"
      >
        <h3
          class="mb-4 text-gh-text text-xl text-center @md:text-left flex items-center justify-center @md:justify-start gap-2 font-mono"
        >
          Activity Signals
        </h3>
        <ul>
          <li
            v-for="flag in analysis.analysis.flags"
            :key="flag.label"
            class="not-last:border-b border-gh-border-light py-4 @md:py-2"
          >
            <h4 class="font-mono">{{ flag.label }}</h4>
            <p class="text-gh-muted">
              {{ flag.detail }}
            </p>
          </li>
        </ul>
      </div>

      <NoActivityState v-else :is-flagged="hasCommunityFlag" />
    </template>
  </div>
</template>
