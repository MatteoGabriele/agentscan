<script setup lang="ts">
import { ref, computed } from "vue";

interface RepoStats {
  name: string;
  open_prs: number;
  all_prs: number;
}

interface UserStat {
  user_id: number;
  username: string;
  repos: RepoStats[];
  total_open_prs: number;
  score: number;
  total_prs: number;
  days_seen: string[];
}

const { data: scanData } = await useEcosystemHealth();

const selectedRepo = ref("");
const sortBy = ref("user_id");

const userStats = computed<Record<number, UserStat>>(() => {
  const stats: Record<number, UserStat> = {};

  // Only process automation and mixed scores (exclude organic > 70)
  const filteredData = scanData.value.filter((entry) => entry.score <= 70);

  filteredData.forEach((entry) => {
    if (!stats[entry.user_id]) {
      stats[entry.user_id] = {
        user_id: entry.user_id,
        username: entry.username,
        score: entry.score,
        repos: [],
        total_open_prs: 0,
        total_prs: 0,
        days_seen: [],
      };
    }

    const user = stats[entry.user_id];

    if (!user) {
      return;
    }

    // Track days
    const day = entry.created_at?.split("T")[0];
    if (day && !user.days_seen.includes(day)) {
      user.days_seen.push(day);
    }

    // Track repos
    if (!entry.repo_name) {
      return;
    }
    let repo = user.repos.find((r) => r.name === entry.repo_name);
    if (!repo) {
      repo = {
        name: entry.repo_name,
        open_prs: 0,
        all_prs: 0,
      };
      user.repos.push(repo);
    }

    repo.all_prs++;
    if (entry.pr_status === "open") {
      repo.open_prs++;
      user.total_open_prs++;
    }
    user.total_prs++;
  });

  // Sort days for each user
  Object.values(stats).forEach((user) => {
    user.days_seen.sort();
  });

  return stats;
});

const uniqueRepos = computed(() => {
  const repos = new Set<string>();
  scanData.value.forEach((entry) => {
    if (entry.repo_name) {
      repos.add(entry.repo_name);
    }
  });
  return Array.from(repos).sort();
});

const filteredAndSortedUsers = computed(() => {
  let users = Object.values(userStats.value);

  // Filter by repo if selected
  if (selectedRepo.value) {
    users = users.filter((user) =>
      user.repos.some((repo) => repo.name === selectedRepo.value),
    );
  }

  // Sort
  switch (sortBy.value) {
    case "total_prs":
      users.sort((a, b) => b.total_open_prs - a.total_open_prs);
      break;
    case "repos_count":
      users.sort((a, b) => b.repos.length - a.repos.length);
      break;
    case "days_seen":
      users.sort((a, b) => b.days_seen.length - a.days_seen.length);
      break;
    case "user_id":
    default:
      users.sort((a, b) => a.user_id - b.user_id);
  }

  return users;
});

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
</script>

<template>
  <div class="w-full">
    <div class="mb-4 flex gap-4 flex-wrap">
      <div>
        <label class="block text-sm font-medium mb-2"
          >Filter by Repository:</label
        >
        <select
          v-model="selectedRepo"
          class="border rounded px-3 py-2 bg-gh-canvas text-gh-text border-gh-border"
        >
          <option value="">All Repositories</option>
          <option v-for="repo in uniqueRepos" :key="repo" :value="repo">
            {{ repo }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">Sort by:</label>
        <select
          v-model="sortBy"
          class="border rounded px-3 py-2 bg-gh-canvas text-gh-text border-gh-border"
        >
          <option value="user_id">User ID</option>
          <option value="total_prs">Total PRs (High to Low)</option>
          <option value="repos_count">Repositories Count</option>
          <option value="days_seen">Days Seen</option>
        </select>
      </div>
    </div>

    <div class="overflow-x-auto border border-gh-border rounded">
      <table class="w-full">
        <thead class="bg-gh-card border-b border-gh-border">
          <tr>
            <th class="px-4 py-3 text-left text-sm font-semibold">Username</th>
            <th class="px-4 py-3 text-left text-sm font-semibold">Score</th>
            <th class="px-4 py-3 text-left text-sm font-semibold">
              Repositories
            </th>
            <th class="px-4 py-3 text-left text-sm font-semibold">
              Open PRs by Repo
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold">
              Total Open PRs
            </th>
            <th class="px-4 py-3 text-left text-sm font-semibold">
              Days Scanned
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in filteredAndSortedUsers"
            :key="user.user_id"
            class="border-b border-gh-border hover:bg-gh-card transition-colors"
          >
            <td class="px-4 py-3 font-mono text-sm text-gh-muted">
              {{ user.username }}
            </td>
            <td class="px-4 py-3 font-mono text-sm text-gh-muted">
              {{ user.score }}
            </td>
            <td class="px-4 py-3 text-sm">
              {{ user.repos.length }}
            </td>
            <td class="px-4 py-3 text-sm">
              <div v-for="repo in user.repos" :key="repo.name" class="mb-1">
                <span class="font-medium">{{ repo.name }}:</span>
                <span class="text-gh-muted">{{ repo.open_prs }} open</span>
              </div>
            </td>
            <td class="px-4 py-3 text-center font-bold text-sm">
              {{ user.total_open_prs }}
            </td>
            <td class="px-4 py-3 text-sm text-gh-muted">
              <div v-for="day in user.days_seen" :key="day" class="mb-1">
                {{ formatDate(day) }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 text-sm text-gh-muted">
      <p>
        Total unique users:
        <span class="font-semibold">{{ Object.keys(userStats).length }}</span>
      </p>
      <p>
        Total scan entries:
        <span class="font-semibold">{{ scanData.length }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
select {
  border: 1px solid;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
}
</style>
