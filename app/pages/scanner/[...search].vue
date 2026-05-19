<script setup lang="ts">
definePageMeta({
  layout: "minimal",
});

const route = useRoute();

const { data, status, error } = await useAsyncData(() => {
  const [owner, repo] = route.params.search as string[];

  return $fetch("/api/repo", {
    method: "post",
    body: {
      owner,
      repo,
    },
  });
});

const authorResults = ref<
  Record<
    string,
    {
      status: "pending" | "done";
      user?: GitHubUser;
      analysis?: IdentifyReplicantResult;
      error?: string;
      isVerifiedAutomation?: boolean;
      hasIntegration?: boolean;
    }
  >
>({});

const { data: verifiedAutomations } = useVerifiedAutomations();
const { data: integrations } = useIntegrations();

async function analyzeAuthors() {
  if (!data.value?.authors) return;

  // Initialize all authors as pending
  data.value.authors.forEach((author) => {
    authorResults.value[author] = { status: "pending" };
  });

  // Batch size and delay between batches
  const batchSize = 5;
  const delayBetweenBatches = 2000; // 1 second between batches

  for (let i = 0; i < data.value.authors.length; i += batchSize) {
    const batch = data.value.authors.slice(i, i + batchSize);

    // Analyze batch in parallel
    await Promise.all(
      batch.map(async (author) => {
        try {
          // First fetch user metadata
          const user = await $fetch<GitHubUser>(`/api/account/${author}`);

          // Then call identify-replicant with the user's metadata
          const analysis = await $fetch<IdentifyReplicantResult>(
            `/api/identify-replicant/${author}`,
            {
              query: {
                created_at: user.created_at,
                repos_count: user.public_repos,
                pages: 2,
                show_events: false,
              },
            },
          );

          // Check if in verified automations list
          const isVerifiedAutomation = verifiedAutomations.value?.some(
            (account) =>
              account.username.toLowerCase() === author.toLowerCase() ||
              account.id === user.id,
          );

          // Check if in integrations list
          const hasIntegration = integrations.value?.some(
            (item) => item.username.toLowerCase() === author.toLowerCase(),
          );

          authorResults.value[author] = {
            status: "done",
            user,
            analysis,
            isVerifiedAutomation,
            hasIntegration,
          };
        } catch (err: unknown) {
          const error = err as { data?: { message?: string } };
          authorResults.value[author] = {
            status: "done",
            error: error.data?.message || "Failed to analyze",
          };
        }
      }),
    );

    // Wait before next batch (except after the last batch)
    if (i + batchSize < data.value.authors.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }
}

// Start analyzing when data is ready
if (data.value?.authors?.length) {
  analyzeAuthors();
}

function getClassificationColor(
  classification?: IdentityClassification,
  isVerified?: boolean,
): string {
  if (isVerified) {
    return "bg-gh-danger";
  }

  if (!classification) {
    return "bg-gray-500";
  }

  if (classification === "automation") {
    return "bg-orange-500";
  }

  if (classification === "mixed") {
    return "bg-amber-500";
  }

  return "bg-green-500";
}

const automationCount = computed(() => {
  return (
    data.value?.authors.reduce((count, author) => {
      const result = authorResults.value[author];
      if (!result || result.status === "pending") return count;

      return result.analysis?.analysis.classification === "automation"
        ? count + 1
        : count;
    }, 0) ?? 0
  );
});

const mixedCount = computed(() => {
  return (
    data.value?.authors.reduce((count, author) => {
      const result = authorResults.value[author];
      if (!result || result.status === "pending") return count;

      return result.analysis?.analysis.classification === "mixed"
        ? count + 1
        : count;
    }, 0) ?? 0
  );
});

const flaggedCount = computed(() => {
  return (
    data.value?.authors.reduce((count, author) => {
      const result = authorResults.value[author];
      return result?.isVerifiedAutomation || result?.hasIntegration
        ? count + 1
        : count;
    }, 0) ?? 0
  );
});

watch(
  () => data.value?.authors,
  (authors) => {
    if (authors?.length) {
      analyzeAuthors();
    }
  },
);
</script>

<template>
  <div v-if="status === 'pending'">loading data...</div>
  <div v-else-if="data" class="pb-12">
    <header>
      <p class="mb-4">
        {{ data.authors.length }} users found from {{ data.issuesCount }} issues
        and {{ data.pullRequestsCount }} PRs
      </p>
      <div class="flex flex-wrap gap-6 text-sm border-t border-gh-border pt-4">
        <div>
          <span class="text-gh-muted block text-xs mb-1">Automation</span>
          <span class="font-mono font-bold text-lg">{{ automationCount }}</span>
        </div>
        <div>
          <span class="text-gh-muted block text-xs mb-1">Mixed</span>
          <span class="font-mono font-bold text-lg">{{ mixedCount }}</span>
        </div>
        <div>
          <span class="text-gh-muted block text-xs mb-1">Flagged</span>
          <span class="font-mono font-bold text-lg">{{ flaggedCount }}</span>
        </div>
      </div>
    </header>
    <ul class="mt-6 space-y-3">
      <li
        v-for="author in data.authors"
        :key="author"
        class="flex items-center justify-between p-3 bg-gh-card rounded border border-gh-border"
      >
        <span class="font-mono">{{ author }}</span>
        <div v-if="authorResults[author]" class="flex items-center gap-3">
          <template v-if="authorResults[author].status === 'pending'">
            <span class="i-carbon-loading animate-spin text-gh-muted" />
          </template>
          <span
            v-else-if="authorResults[author].isVerifiedAutomation"
            class="flex items-center gap-2"
          >
            <span class="bg-gh-danger w-2 h-2 rounded-full" />
            <span
              class="px-2 py-1 bg-gh-danger/10 text-gh-danger text-xs rounded font-mono"
            >
              Flagged by the community
            </span>
          </span>
          <template v-else-if="authorResults[author].analysis">
            <div class="flex items-center gap-2">
              <span
                :class="
                  getClassificationColor(
                    authorResults[author].analysis?.analysis.classification,
                    false,
                  )
                "
                class="w-2 h-2 rounded-full"
              />
              <span class="text-sm text-gh-muted">
                {{ authorResults[author].analysis?.analysis.classification }}
              </span>
              <div class="flex gap-1">
                <span
                  v-if="authorResults[author].hasIntegration"
                  class="px-2 py-1 bg-amber-500/10 text-amber-500 text-xs rounded font-mono"
                >
                  ⚙️ integration
                </span>
              </div>
            </div>
          </template>
          <template v-else>
            <span class="text-sm text-red-500">
              {{ authorResults[author].error || "error" }}
            </span>
          </template>
        </div>
      </li>
    </ul>
  </div>
  <div v-else-if="error">
    {{ error.message }}
  </div>
</template>
