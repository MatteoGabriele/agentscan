<script setup lang="ts">
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

// const { data: signals, refresh: refreshSignals } = await useFetch<Reaction[]>(
//   () => `/api/signals/${accountName.value}`,
//   {
//     key: `signals:${accountName.value}`,
//   },
// );

// const { data: me } = await useFetch("/api/auth/me");
// const hasAnySignal = computed<boolean>(() => {
//   if (!signals.value?.length) {
//     return false;
//   }

//   return signals.value?.some((r: any) => r.did === me.value?.user?.did);
// });

// const isLoginModalOpen = ref<boolean>(false);
// function openLoginModal() {
//   isLoginModalOpen.value = true;
// }
// function closeLoginModal() {
//   isLoginModalOpen.value = false;
// }

// const isSignalModal = ref<boolean>(false);
// function openSignalModal() {
//   isSignalModal.value = true;
// }
// function closeSignalModal() {
//   isSignalModal.value = false;
// }

// async function handleFlagging() {
//   if (!me.value?.user) {
//     openLoginModal();
//     return;
//   }

//   openSignalModal();
// }

// async function onSignalSubmit() {
//   await refreshSignals();
//   closeSignalModal();
// }

function handleSubmit(name: string) {
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
    return "Organic activity";
  }

  if (score >= CONFIG.THRESHOLD_SUSPICIOUS) {
    return "Mixed signals";
  }

  return "Unusual activity";
});

const classificationIcon = computed<string>(() => {
  const score = data.value?.analysis.score ?? 0;

  if (score >= CONFIG.THRESHOLD_HUMAN) {
    return "i-carbon:growth";
  }

  if (score >= CONFIG.THRESHOLD_SUSPICIOUS) {
    return "i-carbon:unknown";
  }

  return "i-carbon:meter-alt";
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

  const label = classificationLabel.value;
  const flagsCounter = data.value.analysis.flags.length;
  // const signalsCounter = signals.value?.length ?? 0;

  let description = label;

  // if (signalsCounter > 0) {
  //   description += ` | ${signalsCounter} community signals`;
  // }

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
  <!-- <LoginModal v-if="isLoginModalOpen" @close="closeLoginModal" />
  <SignalModal
    :account-name="accountName"
    :is-flagged="hasAnySignal"
    v-if="isSignalModal"
    @close="closeSignalModal"
    @submit="onSignalSubmit"
  /> -->

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
        <h2 class="text-gh-text text-3xl @lg:text-xl">
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
          class="flex flex-col items-center @md:items-start @md:flex-row @md:gap-4 mt-4 @md:mt-2 text-base @md:text-sm text-gh-muted"
        >
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-user-multiple hidden @md:inline-block"
              aria-hidden="true"
            />
            {{ data.user.followers }} followers
          </li>
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-repo-source-code hidden @md:inline-block"
              aria-hidden="true"
            />
            <span v-if="data.user.public_repos === 0">No repos</span>
            <span v-else>{{ data.user.public_repos }} repos</span>
          </li>
          <li class="flex items-center gap-1">
            <span
              class="i-carbon-calendar hidden @md:inline-block"
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
        <header class="flex items-center justify-between">
          <div class="flex gap-2 items-center" :class="scoreClasses.text">
            <span :class="classificationIcon" class="text-base" />
            <h3 class="text-xl">
              {{ classificationLabel }}
            </h3>
          </div>

          <!-- <button
            @click="handleFlagging"
            class="text-red flex hover:bg-gh-red-hover hover:text-gh-bg transition-colors size-8 text-sm rounded-full items-center justify-center"
          >
            <span
              class="i-carbon:connection-signal"
              :aria-label="hasAnySignal ? 'Account is flagged' : 'Flag account'"
            />
          </button> -->
        </header>
        <p class="text-gh-muted mt-1" v-if="data.eventsCount > 0">
          Based on {{ data.eventsCount }} recent
          <NuxtLink
            external
            target="_blank"
            class="underline"
            :to="`https://api.github.com/users/${data.user.login}/events?per_page=100`"
          >
            events
          </NuxtLink>
          on GitHub
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

        <!-- <Transition name="fade">
          <div v-if="signals?.length" class="mt-4">
            <h3 class="text-sm">
              Signaled by {{ signals.length }}
              {{ signals.length === 1 ? "user" : "users" }}
            </h3>
            <TransitionGroup
              name="avatar"
              tag="ul"
              class="mt-2 flex w-full flex-wrap items-center"
            >
              <li v-for="reaction in signals" :key="reaction.did" class="-mr-2">
                <NuxtLink
                  external
                  :to="`https://bsky.app/profile/${reaction.handle}`"
                  class="flex"
                  target="_blank"
                >
                  <div
                    class="size-8 overflow-hidden rounded-full border-2 border-gh-border"
                  >
                    <img :src="reaction.avatar" aria-hidden="true" />
                  </div>
                  <span class="sr-only">{{ reaction.displayName }}</span>
                </NuxtLink>
              </li>
            </TransitionGroup>
          </div>
        </Transition> -->
      </div>
    </div>

    <div
      v-if="data.analysis.flags.length > 0"
      class="bg-gh-card p-6 rounded-2 border-1 border-solid border-gh-border"
    >
      <h3
        class="mb-4 text-gh-text text-xl text-center @md:text-left flex items-center justify-center @md:justify-start gap-2"
      >
        Activity Signals
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
        No unusual activity found
      </p>
    </div>
  </div>
</template>

<style scoped>
/* whole block fades in */
.fade-enter-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from {
  opacity: 0;
}

/* individual avatars pop in/out */
.avatar-enter-active {
  transition: all 0.3s ease;
}
.avatar-leave-active {
  transition: all 0.2s ease;
  position: absolute;
}
.avatar-enter-from {
  opacity: 0;
  transform: scale(0.5);
}
.avatar-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
.avatar-move {
  transition: transform 0.3s ease;
}
</style>
