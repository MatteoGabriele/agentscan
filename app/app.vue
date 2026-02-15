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
} = useFetch("/api/user", {
  query: { user: queryUser },
  immediate: !!initialUser.value,
  watch: false,
  server: true,
});

function handleSubmit() {
  const username = accountName.value.trim();

  if (!username) {
    return;
  }

  queryUser.value = username;
  router.push({ query: { user: username } });

  getUserData();
}

const HUMAN_SCORE = 70;
const SUSPICIOUS_SCORE = 50;

const scoreColor = computed(() => {
  if (!data.value?.analysis) {
    return "gray";
  }

  const score = data.value.analysis.score;

  if (score >= HUMAN_SCORE) {
    return "#22c55e";
  }

  if (score >= SUSPICIOUS_SCORE) {
    return "#f59e0b";
  }

  return "#ef4444";
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

  return `Score: ${score}/100 | ${flags} detection flags | ${data.value.eventCount} events analyzed`;
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
  <div class="max-w-150 mx-auto py-8 px-4">
    <header class="text-center mb-8">
      <h1 class="text-2rem text-white">AgentScan</h1>
      <p class="text-gh-muted mt-2">
        Detect suspicious AI agents activities on GitHub
      </p>
    </header>

    <form @submit.prevent="handleSubmit" class="flex gap-2 mb-8">
      <input
        v-model="accountName"
        type="text"
        placeholder="Enter GitHub username..."
        :disabled="status === 'pending'"
        class="flex-1 py-2 px-4 border-1 border-solid border-gh-border rounded-1.5 bg-gh-card text-gh-text text-base outline-none focus:border-gh-blue"
      />
      <button
        type="submit"
        :disabled="status === 'pending' || accountName === ''"
        class="px-6 bg-gh-green border-none rounded-1.5 text-white font-600 cursor-pointer hover:bg-gh-green-hover disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Analyze
      </button>
    </form>

    <div v-if="status === 'pending'" class="text-center py-12">
      <div
        class="w-10 h-10 rounded-full mx-auto mb-4 animate-spin border-3 border-solid border-gh-border border-t-gh-green"
      ></div>
      <p>Analyzing @{{ queryUser }}...</p>
    </div>

    <div
      v-else-if="error"
      class="bg-gh-red-bg border-1 border-solid border-gh-red p-4 rounded-1.5 text-center"
    >
      <p>{{ error.data?.message || "Failed to analyze user" }}</p>
    </div>

    <div v-else-if="data?.analysis" class="flex flex-col gap-6">
      <div
        class="flex gap-4 bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border"
      >
        <img
          :src="data.user.avatar"
          :alt="data.user.login"
          class="w-20 h-20 rounded-full"
        />
        <div>
          <h2 class="text-white text-1.25rem">
            {{ data.user.name || data.user.login }}
          </h2>
          <p class="text-gh-muted my-1">@{{ data.user.login }}</p>
          <p v-if="data.user.bio" class="my-2 text-0.9rem">
            {{ data.user.bio }}
          </p>
          <ul
            class="flex flex-col sm:flex-row sm:gap-4 mt-2 text-0.85rem text-gh-muted"
          >
            <li>{{ data.user.followers }} followers</li>
            <li>{{ data.user.repos }} repos</li>
            <li>Joined <NuxtTime :datetime="data.user.created" relative /></li>
          </ul>
        </div>
      </div>

      <div
        class="flex items-center gap-6 bg-gh-card p-6 rounded-2 border-2 border-solid"
        :style="{ borderColor: scoreColor }"
      >
        <div
          class="w-17.5 h-17.5 rounded-full flex items-center justify-center text-1.5rem font-bold text-white"
          :style="{ background: scoreColor }"
        >
          {{ data.analysis.score }}
        </div>
        <div>
          <header
            class="flex gap-2 items-center"
            :style="{ color: scoreColor }"
          >
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
        <h3 class="mb-4 text-white">Detection Flags</h3>
        <ul>
          <li
            v-for="flag in data.analysis.flags"
            :key="flag.label"
            class="flex items-center gap-3 not-last:border-b border-gh-border-light py-2"
          >
            <strong>{{ flag.label }}</strong>
            <span class="text-gh-muted text-0.9rem">{{ flag.detail }}</span>
          </li>
        </ul>
      </div>

      <div
        v-else
        class="bg-gh-green-bg border-1 border-solid border-gh-green p-6 rounded-2 text-center text-gh-green-text"
      >
        <p>No suspicious patterns detected</p>
      </div>
    </div>
  </div>
</template>
