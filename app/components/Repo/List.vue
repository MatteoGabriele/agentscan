<script setup lang="ts">
import type { GitHubUser } from "@unveil/identity";

const props = defineProps<{
  repo: string;
}>();

const {
  data: repoData,
  error: repoError,
  status: repoStatus,
} = await useAsyncData(() => {
  return $fetch(`/api/repo/${props.repo}`);
});

const analyzedUsers = ref<
  Map<string, { user: GitHubUser | null; analysis: any; loading: boolean }>
>(new Map());

const { data: verifiedAutomations } = useVerifiedAutomations();

const hasVerifiedAutomations = computed<boolean>(() => {
  if (!repoData.value?.authors || !verifiedAutomations.value) return false;
  return repoData.value.authors.some((author) =>
    verifiedAutomations.value?.some(
      (account) => account.username.toLowerCase() === author.toLowerCase(),
    ),
  );
});

const REQUEST_DELAY_MS = 1000;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryFetch = async <T,>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      console.warn(`Attempt ${i + 1}/${maxRetries} failed, retrying...`, err);
      if (i < maxRetries - 1) {
        await delay(delayMs);
      }
    }
  }
  throw lastError;
};

const getCacheKey = (author: string) => `analysis:${author}`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const getCachedAnalysis = (author: string) => {
  if (process.server) return null;
  try {
    const cached = localStorage.getItem(getCacheKey(author));
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;
    if (age > CACHE_TTL_MS) return null; // Cache expired
    return parsed.data;
  } catch {
    return null;
  }
};

const setCachedAnalysis = (author: string, data: any) => {
  if (process.server) return;
  try {
    localStorage.setItem(
      getCacheKey(author),
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch {}
};

const getClassificationScore = (classification: string | undefined): number => {
  if (!classification) return 0;
  if (classification === "organic") return 100;
  if (classification === "mixed") return 66;
  if (classification === "suspicious") return 33;
  return 0;
};

const getScore = (analysis: any): number | null => {
  if (!analysis) return null;
  if (analysis.analysis?.score !== undefined) return analysis.analysis.score;
  if (analysis.score !== undefined) return analysis.score;
  return null;
};

const getClassification = (analysis: any): string | null => {
  if (!analysis) {
    return null;
  }

  if (analysis.analysis?.classification) {
    return analysis.analysis.classification;
  }

  if (analysis.classification) {
    return analysis.classification;
  }

  return null;
};

// Compute overall repo score based on actual analysis scores
const repoScore = computed<{
  average: number;
  total: number;
  completed: number;
  label: string;
  color: string;
  classificationCounts: { organic: number; mixed: number; automation: number };
} | null>(() => {
  if (analyzedUsers.value.size === 0) {
    return null;
  }

  let totalScore = 0;
  let completedCount = 0;
  const classificationCounts = { organic: 0, mixed: 0, automation: 0 };

  for (const [, data] of analyzedUsers.value) {
    if (!data.loading && data.analysis && getScore(data.analysis) !== null) {
      totalScore += getScore(data.analysis)!;
      completedCount++;

      const classification = getClassification(data.analysis);
      if (classification === "organic") {
        classificationCounts.organic++;
      } else if (classification === "mixed") {
        classificationCounts.mixed++;
      } else if (classification === "automation") {
        classificationCounts.automation++;
      }
    }
  }

  if (completedCount === 0) return null;

  const average = totalScore / completedCount;

  let label = "Unknown";
  let color = "text-gray-500";

  if (average >= 70) {
    label = "Healthy";
    color = "text-green-500";
  } else if (average >= 50) {
    label = "Mixed";
    color = "text-amber-500";
  } else if (average > 0) {
    label = "Suspicious";
    color = "text-orange-500";
  }

  return {
    average: Math.round(average),
    total: repoData.value?.authors.length || 0,
    completed: completedCount,
    label,
    color,
    classificationCounts,
  };
});

const processAuthors = async () => {
  if (!repoData.value?.authors) return;

  for (const author of repoData.value.authors) {
    const cached = getCachedAnalysis(author);
    if (cached) {
      analyzedUsers.value.set(author, {
        user: cached.user,
        analysis: cached.analysis,
        loading: false,
      });
    } else {
      analyzedUsers.value.set(author, {
        user: null,
        analysis: null,
        loading: false,
      });
    }
  }

  for (const author of repoData.value.authors) {
    const cached = getCachedAnalysis(author);
    if (cached) {
      continue;
    }

    try {
      const userDataPromise = $fetch<GitHubUser>(`/api/account/${author}`);

      const showLoadingPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), 300); // Show loading if not resolved in 300ms
      });

      const shouldShowLoading = await Promise.race([
        userDataPromise.then(() => false),
        showLoadingPromise,
      ]);

      if (shouldShowLoading) {
        analyzedUsers.value.set(author, {
          user: null,
          analysis: null,
          loading: true,
        });
      }

      await delay(REQUEST_DELAY_MS);

      const userData = await userDataPromise;

      await delay(REQUEST_DELAY_MS);

      const analysisData = await retryFetch(
        () =>
          $fetch(`/api/identify-replicant/${author}`, {
            query: {
              created_at: userData.created_at,
              repos_count: userData.public_repos,
              pages: 2,
              show_events: true,
            },
          }),
        3,
        1000,
      );

      const completeData = {
        user: userData,
        analysis: analysisData,
        loading: false,
      };
      analyzedUsers.value.set(author, completeData);
      setCachedAnalysis(author, completeData);
    } catch (err) {
      console.error(`Error analyzing ${author}:`, err);
      const existing = analyzedUsers.value.get(author) || {
        user: null,
        analysis: null,
      };
      analyzedUsers.value.set(author, {
        user: existing.user,
        analysis: null,
        loading: false,
      });
    }
  }
};

watchEffect(() => {
  if (repoData.value?.authors) {
    processAuthors();
  }
});
</script>

<template>
  <div>
    <div v-if="repoStatus === 'pending'" class="p-4">
      Loading repository data...
    </div>

    <div v-else-if="repoError" class="p-4 text-red-500">
      {{ repoError.message }}
    </div>

    <template v-else-if="repoData">
      <div class="p-4 @container">
        <h1 class="text-2xl font-bold mb-6">{{ repoData.repository }}</h1>
        <p class="mb-4 text-gray-400">
          {{ repoData.openPRsCount }} open pull requests
        </p>

        <div class="mb-8 bg-gh-card p-6 rounded-lg border border-gh-border">
          <div class="mb-4">
            <p class="text-sm text-gray-400 mb-2">Repository Health Score</p>

            <div v-if="repoScore === null" class="flex items-center gap-4">
              <div>
                <div
                  class="h-12 w-24 bg-gh-border rounded animate-pulse mb-2"
                ></div>
                <div class="h-6 w-20 bg-gh-border rounded animate-pulse"></div>
              </div>
              <div class="text-right text-sm text-gray-400">
                <div class="h-5 w-32 bg-gh-border rounded animate-pulse"></div>
              </div>
            </div>

            <div v-else class="flex items-center justify-between">
              <div>
                <p :class="`text-4xl font-bold ${repoScore.color}`">
                  {{ repoScore.average }}%
                </p>
                <p :class="`text-lg font-semibold ${repoScore.color}`">
                  {{ repoScore.label }}
                </p>
              </div>
              <div class="text-right text-sm text-gray-400">
                <p>
                  {{ repoScore.completed }} / {{ repoScore.total }} analyzed
                </p>
              </div>
            </div>
          </div>

          <!-- Classification Breakdown -->
          <div
            v-if="repoScore"
            class="border-t border-gh-border pt-4 space-y-2 text-sm"
          >
            <p class="text-gray-400 font-semibold mb-3">
              Classification Summary:
            </p>
            <div class="flex justify-between text-gray-300">
              <span class="flex items-center gap-2">
                <span class="block size-3 rounded-full bg-green-500"></span>
                <span>Organic</span>
              </span>
              <span class="text-gray-500">{{
                repoScore.classificationCounts.organic
              }}</span>
            </div>
            <div class="flex justify-between text-gray-300">
              <span class="flex items-center gap-2">
                <span class="block size-3 rounded-full bg-amber-500"></span>
                <span>Mixed</span>
              </span>
              <span class="text-gray-500">{{
                repoScore.classificationCounts.mixed
              }}</span>
            </div>
            <div class="flex justify-between text-gray-300">
              <span class="flex items-center gap-2">
                <span class="block size-3 rounded-full bg-orange-500"></span>
                <span>Automation</span>
              </span>
              <span class="text-gray-500">{{
                repoScore.classificationCounts.automation
              }}</span>
            </div>
            <div
              v-if="hasVerifiedAutomations"
              class="flex justify-between pt-2 border-t border-gh-border mt-2"
            >
              <span class="text-gh-danger"
                >⚠️ Contains verified automations</span
              >
            </div>
          </div>
        </div>

        <!-- Compact User List -->
        <div class="space-y-2">
          <div
            v-for="[author, data] of analyzedUsers"
            :key="author"
            class="flex items-center justify-between gap-4 bg-gh-card p-3 rounded-lg border border-gh-border hover:border-gh-text/30 transition-colors"
          >
            <!-- Left: User Avatar and Name -->
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <!-- Avatar -->
              <div class="size-8 rounded-full overflow-hidden shrink-0">
                <img
                  :src="
                    data.user?.avatar_url ||
                    `https://avatars.githubusercontent.com/${author}`
                  "
                  :alt="`Avatar of ${author}`"
                  class="w-full h-full object-cover"
                />
              </div>

              <!-- Name and username -->
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gh-text truncate">
                  {{ data.user?.name || author }}
                </p>
                <p class="text-xs text-gh-muted">@{{ author }}</p>
              </div>
            </div>

            <!-- Right: Loading Spinner or Score -->
            <div class="flex items-center gap-3 shrink-0">
              <!-- Loading/Processing state -->
              <div
                v-if="data.loading || !data.analysis"
                class="flex items-center gap-2"
              >
                <span
                  class="i-lucide:loader-circle animate-spin text-gray-400"
                />
              </div>

              <!-- Failed state -->
              <div
                v-else-if="!data.analysis && !data.loading"
                class="text-xs text-red-500"
              >
                Failed
              </div>

              <!-- Completed state with score -->
              <div
                v-else-if="getScore(data.analysis) !== null"
                class="text-right"
              >
                <p
                  :class="{
                    'text-sm font-bold': true,
                    'text-green-500': getScore(data.analysis)! >= 70,
                    'text-amber-500':
                      getScore(data.analysis)! >= 50 &&
                      getScore(data.analysis)! < 70,
                    'text-orange-500': getScore(data.analysis)! < 50,
                  }"
                >
                  {{ getScore(data.analysis) }}%
                </p>
                <p class="text-xs text-gray-400">
                  {{
                    getClassification(data.analysis) === "organic"
                      ? "Organic"
                      : getClassification(data.analysis) === "mixed"
                        ? "Mixed"
                        : "Automation"
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
