<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const initialUser = computed<string>(() => {
  return (route.query.user as string) || "";
});

const accountName = ref(initialUser.value);
const queryUser = ref(initialUser.value);

const {
  data,
  execute: getUserData,
  status,
  error,
  clear: clearUserData,
} = useFetch("/api/identify-replicant", {
  query: { user: queryUser },
  immediate: !!initialUser.value,
  watch: false,
});

function handleSubmit() {
  const username = accountName.value.trim();

  if (!username) {
    return;
  }

  queryUser.value = username;
  router.push({ query: { user: username } });

  clearUserData();
  nextTick(() => {
    getUserData();
  });
}

const isEmptyState = computed(() => {
  return status.value === "idle" && !data.value && !error.value;
});

const scoreClasses = computed(() => {
  if (!data.value?.analysis) {
    return {
      text: "text-gray-500",
      border: "border-gray-500",
      bg: "bg-gray-500",
    };
  }

  const score = data.value.analysis.score;

  if (score >= CONFIG.THRESHOLD_HUMAN) {
    return {
      text: "text-green-500",
      border: "border-green-500",
      bg: "bg-green-500",
    };
  }

  if (score >= CONFIG.THRESHOLD_SUSPICIOUS) {
    return {
      text: "text-amber-500",
      border: "border-amber-500",
      bg: "bg-amber-500",
    };
  }

  return {
    text: "text-red-500",
    border: "border-red-500",
    bg: "bg-red-500",
  };
});

const classificationLabel = computed<string>(() => {
  if (!data.value?.analysis) {
    return "";
  }

  const type = data.value.analysis.classification;

  if (type === "likely_bot") {
    return "Likely Bot";
  }
  if (type === "suspicious") {
    return "Suspicious";
  }

  return "Human";
});

const classificationIcon = computed<string>(() => {
  if (!data.value?.analysis) {
    return "";
  }

  const type = data.value.analysis.classification;

  if (type === "likely_bot") {
    return "i-carbon-machine-learning";
  }
  if (type === "suspicious") {
    return "i-carbon-warning";
  }

  return "i-carbon-face-satisfied";
});

const ogTitle = computed(() => {
  if (!data.value?.user) return "AgentScan - GitHub AI Agent Detector";
  return `@${data.value.user.login} - ${classificationLabel.value} | AgentScan`;
});

const ogDescription = computed(() => {
  if (!data.value?.analysis) {
    return "Detect suspicious AI agent activities on GitHub accounts";
  }

  const score = data.value.analysis.score;
  const flags = data.value.analysis.flags.length;

  return `Score: ${score}/100 | ${flags} notable patterns | ${data.value.eventCount} events analyzed`;
});

const ogImage = computed(() => {
  if (!data.value?.user) {
    return "/og.png";
  }

  return data.value.user.avatar;
});

useHead({
  title: ogTitle,
  meta: [
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
    { name: "twitter:image", content: ogImage },
  ],
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <main
      class="max-w-screen-sm mx-auto py-8 px-4 @container flex-1 w-full"
      :class="{ 'flex flex-col justify-center': isEmptyState }"
    >
      <header class="text-center mb-8">
        <h1
          class="text-3xl text-white flex items-center justify-center gap-2 mb-2"
        >
          <span
            class="i-carbon-fingerprint-recognition text-gh-blue"
            aria-hidden="true"
          />
          AgentScan
        </h1>
        <p class="text-gh-muted text-balance @md:text-wrap">
          Detect suspicious AI agents activities on GitHub
        </p>
      </header>

      <form
        @submit.prevent="handleSubmit"
        class="flex flex-col @md:flex-row gap-2 mb-8"
      >
        <label class="sr-only" for="userName">Enter GitHub username</label>
        <input
          v-model="accountName"
          type="text"
          id="userName"
          placeholder="Enter GitHub username..."
          :disabled="status === 'pending'"
          class="flex-1 py-2 px-4 border-1 border-solid border-gh-border rounded-1.5 bg-gh-card text-gh-text text-base outline-none focus:border-gh-blue"
        />

        <button
          type="submit"
          :disabled="status === 'pending' || accountName === ''"
          class="py-2 px-6 bg-gh-green border-none rounded-1.5 text-white font-600 cursor-pointer hover:bg-gh-green-hover disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          <span class="i-carbon-search" aria-hidden="true" />
          Analyze
        </button>
      </form>

      <div v-if="status === 'pending'" class="text-center py-12">
        <div
          class="w-10 h-10 rounded-full mx-auto mb-4 animate-spin border-3 border-solid border-gh-border border-t-gh-green"
        />
        <p>Analyzing @{{ queryUser }}...</p>
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
          <img
            :src="data.user.avatar"
            :alt="`Avatar of ${data.user.login}`"
            class="size-40 @lg:size-20 rounded-full"
          />
          <div
            class="w-full flex flex-col justify-center items-center @lg:items-start text-center @lg:text-left"
          >
            <h2 class="text-white text-3xl @lg:text-xl">
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
              class="flex flex-col items-center @lg:items-start @lg:flex-row @lg:gap-4 mt-4 @lg:mt-2 text-base @lg:text-sm text-gh-muted"
            >
              <li class="flex items-center gap-1">
                <span
                  class="i-carbon-user-multiple hidden @lg:inline-block"
                  aria-hidden="true"
                />
                {{ data.user.followers }} followers
              </li>
              <li class="flex items-center gap-1">
                <span
                  class="i-carbon-repo-source-code hidden @lg:inline-block"
                  aria-hidden="true"
                />
                {{ data.user.repos }} repos
              </li>
              <li class="flex items-center gap-1">
                <span
                  class="i-carbon-calendar hidden @lg:inline-block"
                  aria-hidden="true"
                />
                Joined
                <NuxtTime :datetime="data.user.created" :relative="true" />
              </li>
            </ul>
          </div>
        </div>

        <div
          class="flex items-center gap-6 bg-gh-card p-6 rounded-2 border-2 border-solid"
          :class="scoreClasses.border"
        >
          <div
            class="size-20 shrink-0 rounded-full flex items-center justify-center text-xl font-bold text-white"
            :class="scoreClasses.bg"
          >
            {{ data.analysis.score }}
          </div>
          <div>
            <header class="flex gap-2 items-center" :class="scoreClasses.text">
              <span :class="classificationIcon" class="text-base" />
              <h3 class="text-xl">
                {{ classificationLabel }}
              </h3>
            </header>
            <p class="text-gh-muted mt-1">
              Based on {{ data.eventCount }} recent events
            </p>
          </div>
        </div>

        <div
          v-if="data.analysis.flags.length > 0"
          class="bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border"
        >
          <h3
            class="mb-4 text-white text-xl text-center @md:text-left flex items-center justify-center @md:justify-start gap-2"
          >
            Notable patterns
          </h3>
          <ul>
            <li
              v-for="flag in data.analysis.flags"
              :key="flag.label"
              class="not-last:border-b border-gh-border-light py-4 @md:py-2"
            >
              <h4>{{ flag.label }}</h4>
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
            <span
              class="i-carbon-checkmark-filled text-xl"
              aria-hidden="true"
            />
            No notable patterns detected
          </p>
        </div>
      </div>
    </main>

    <footer
      class="py-6 border-t border-gh-border text-center text-gh-muted text-sm"
    >
      <p class="flex items-center justify-center gap-1">
        Made with
        <span
          class="i-carbon-favorite-filled text-red-500"
          aria-hidden="true"
        />
        by
        <NuxtLink
          :external="true"
          target="_blank"
          to="https://github.com/MatteoGabriele"
          class="underline"
        >
          MatteoGabriele
        </NuxtLink>
      </p>
      <p class="mt-2 text-xs text-gh-muted/70 max-w-100 mx-auto">
        This tool uses an opinionated scoring system. Results should be taken as
        indicators, not definitive judgments.
      </p>
    </footer>
  </div>
</template>
