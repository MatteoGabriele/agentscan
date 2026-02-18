<script setup lang="ts">
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

const accountName = ref(initialUser.value);

const { data, status, error } = await useFetch("/api/identify-replicant", {
  query: { user: accountName },
  key: accountName,
  watch: false,
});

function handleSubmit() {
  const name = accountName.value.trim();

  if (!name) {
    return;
  }

  router.push({ name: "user-name", params: { name } });
}

const scoreClasses = computed(() => {
  const score = data.value?.analysis.score ?? 0;

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
  const score = data.value?.analysis.score ?? 0;

  if (score >= CONFIG.THRESHOLD_HUMAN) {
    return "Human";
  }

  if (score >= CONFIG.THRESHOLD_SUSPICIOUS) {
    return "Suspiscious";
  }

  return "Likely Bot";
});

const classificationIcon = computed<string>(() => {
  const score = data.value?.analysis.score ?? 0;

  if (score >= CONFIG.THRESHOLD_HUMAN) {
    return "i-carbon-face-satisfied";
  }

  if (score >= CONFIG.THRESHOLD_SUSPICIOUS) {
    return "i-carbon-warning";
  }

  return "i-carbon-machine-learning";
});

const ogTitle = computed(() => {
  if (!data.value?.user) {
    return;
  }

  return `@${data.value.user.login} - ${classificationLabel.value} | AgentScan`;
});

const ogDescription = computed(() => {
  if (!data.value?.analysis) {
    return;
  }

  const score = data.value.analysis.score;
  const flags = data.value.analysis.flags.length;

  return `Score: ${score}/100 | ${flags} notable patterns | ${data.value.eventsCount} events analyzed`;
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
    <div
      class="w-10 h-10 rounded-full mx-auto mb-4 animate-spin border-3 border-solid border-gh-border border-t-gh-green"
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
            <span v-if="data.user.public_repos === 0">No repos</span>
            <span v-else>{{ data.user.public_repos }} repos</span>
          </li>
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-calendar hidden @lg:inline-block"
              aria-hidden="true"
            />
            Member since
            <NuxtTime :datetime="data.user.created_at" date-style="medium" />
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
        <p class="text-gh-muted mt-1" v-if="data.eventsCount > 0">
          Based on {{ data.eventsCount }} recent
          <NuxtLink
            external
            target="_blank"
            class="underline"
            :to="`https://api.github.com/users/${data.user.login}/events?per_page=100`"
            >events</NuxtLink
          >
          on GitHub
        </p>
        <p v-else>
          No recent
          <NuxtLink
            external
            target="_blank"
            class="underline"
            :to="`https://api.github.com/users/${data.user.login}/events?per_page=100`"
            >events</NuxtLink
          >
          from this account
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
        <span class="i-carbon-checkmark-filled text-xl" aria-hidden="true" />
        No notable patterns detected
      </p>
    </div>
  </div>
</template>
