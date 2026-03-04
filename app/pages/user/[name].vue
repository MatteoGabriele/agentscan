<script setup lang="ts">
import dayjs from "dayjs";
import { CONFIG } from "~~/shared/utils/voight-kampff-test/config";

const route = useRoute();
const router = useRouter();

const initialUser = computed<string>(() => {
  if (!route.params.name) {
    return "";
  }

  if (typeof route.params.name === "string") {
    return route.params.name;
  }

  return route.params.name[0] ?? "";
});

const accountName = ref(initialUser.value.toLowerCase());

const { data, status, error } = await useFetch(
  () => "/api/identify-replicant",
  {
    query: { user: accountName },
    key: accountName,
    watch: false,
  },
);

const { latestFlaggedAgents } = await useFlaggedAgents();

const flaggedItem = computed(() => {
  return latestFlaggedAgents.value.find(
    (account) => account.username === initialUser.value,
  );
});

const isFlagged = computed<boolean>(() => !!flaggedItem.value);

const flagCreatedAt = computed<string | undefined>(() => {
  if (!flaggedItem.value) {
    return;
  }

  return dayjs(flaggedItem.value.createdAt).format("MMM D, YYYY");
});

function handleSubmit(name: string) {
  if (!name) {
    return;
  }

  router.push({ name: "user-name", params: { name } });
}

const score = computed<number>(() => {
  return data.value?.analysis.score ?? 0;
});

const scoreClasses = computed(() => {
  if (isFlagged.value) {
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
  if (!data.value?.user) {
    return;
  }

  return `${data.value.user.login} | AgentScan`;
});

const ogDescription = computed(() => {
  if (!data.value?.analysis) {
    return;
  }

  const label = classificationDetails.value.label;
  const flagsCounter = data.value.analysis.flags.length;

  let description = label;

  if (isFlagged.value) {
    description += ` | flagged by the community`;
  }

  if (flagsCounter > 0) {
    description += ` | ${flagsCounter} flags`;
  }

  return description;
});

const ogImage = computed(() => {
  if (!data.value?.user) {
    return "/og.png";
  }

  return data.value.user.avatar_url;
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
  <AnalyzeForm v-model="accountName" @submit="handleSubmit" />

  <div v-if="status === 'pending'" class="text-center py-12">
    <span
      class="i-carbon-circle-dash animate-spin text-4xl text-gh-green mx-auto mb-4 block"
      aria-label="Loading"
    />
    <p>Analyzing @{{ accountName }}...</p>
  </div>

  <div
    v-else-if="error"
    class="bg-gh-red-bg border-1 border-solid border-gh-red p-4 rounded-1.5 text-center"
  >
    <p class="flex items-center justify-center gap-2">
      {{ error.data?.message || "Failed to analyze user" }}
    </p>
  </div>

  <div v-else-if="data?.analysis" class="flex flex-col gap-6 @container">
    <div
      class="flex flex-col @lg:flex-row justify-center items-center @lg:items-start gap-6 bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border"
    >
      <div class="size-40 @lg:size-20 rounded-full bg-gray-500 shrink-0">
        <img
          v-if="data.user.avatar_url"
          :src="data.user.avatar_url"
          :alt="`Avatar of ${data.user.login}`"
          class="size-40 @lg:size-20 rounded-full bg-gh-card"
        />
      </div>

      <div
        class="w-full flex flex-col justify-center items-center @lg:items-start text-center @lg:text-left"
      >
        <h2 class="text-gh-text text-3xl @lg:text-xl font-mono">
          {{ data.user.name || data.user.login }}
        </h2>
        <NuxtLink
          :external="true"
          target="_blank"
          :to="`https://github.com/${data.user.login}`"
          class="text-gh-muted underline text-xl @lg:text-sm"
        >
          @{{ data.user.login }}
        </NuxtLink>
        <p v-if="data.user.bio" class="my-2">
          {{ data.user.bio }}
        </p>
        <ul
          class="text-gh-muted mt-4 text-sm flex gap-2 sm:gap-4 flex-col items-center sm:flex-row @lg:items-start"
        >
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-user-multiple hidden @md:flex shrink-0"
              aria-hidden="true"
            />
            {{ data.user.followers }} followers
          </li>
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-repo-source-code hidden @md:flex shrink-0"
              aria-hidden="true"
            />
            <span v-if="data.user.public_repos === 0">No repos</span>
            <span v-else>{{ data.user.public_repos }} repos</span>
          </li>
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-calendar hidden @md:flex shrink-0"
              aria-hidden="true"
            />
            Member since
            <NuxtTime :datetime="data.user.created_at" date-style="medium" />
          </li>
        </ul>
      </div>
    </div>

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
          <p v-if="data.eventsCount > 0">
            Analyzed from the last {{ data.eventsCount }} public GitHub
            <NuxtLink
              external
              target="_blank"
              class="underline"
              :to="`https://api.github.com/users/${data.user.login}/events?per_page=100`"
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
              :to="`https://api.github.com/users/${data.user.login}/events?per_page=100`"
            >
              events
            </NuxtLink>
            from this account
          </p>
        </div>

        <section
          v-if="flaggedItem"
          class="mt-4 pt-4 border-t border-gh-border-light"
        >
          <p
            class="flex gap-2 items-center mb-2 text-gh-danger font-mono text-base"
          >
            Community flagged
          </p>
          <p class="text-gh-text text-sm mb-2">
            {{ flaggedItem.reason }}
          </p>
          <footer class="flex items-baseline justify-between">
            <p class="text-gh-muted text-xs">Flagged {{ flagCreatedAt }}</p>
            <NuxtLink
              :to="flaggedItem.issueUrl"
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
      v-if="data.analysis.flags.length > 0"
      class="bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border"
    >
      <h3
        class="mb-4 text-gh-text text-xl text-center @md:text-left flex items-center justify-center @md:justify-start gap-2 font-mono"
      >
        Activity Signals
      </h3>
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
    </div>

    <div
      v-else
      class="bg-gh-green-bg border-1 border-solid border-gh-green p-6 rounded-2 text-center text-gh-green-text"
    >
      <p class="flex items-center justify-center gap-2">
        <span class="i-carbon-checkmark-filled text-xl" aria-hidden="true" />
        No unusual activity found
      </p>
    </div>
  </div>
</template>
