<script setup lang="ts">
const { data, pending } = useBountyRepos();

const search = ref("");

const repos = computed<BountyRepo[]>(() => data.value ?? []);

const filteredRepos = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return repos.value;
  return repos.value.filter((r) => r.repo.toLowerCase().includes(q));
});

const clusters = computed(() => {
  const map: Record<string, { name: string; entries: BountyRepo[] }> = {};
  filteredRepos.value.forEach((r) => {
    const name = nameOf(r.repo);
    const key = name.toLowerCase();
    if (!map[key]) map[key] = { name, entries: [] };
    map[key]!.entries.push(r);
  });
  return Object.values(map).sort((a, b) => b.entries.length - a.entries.length);
});

const nameClusters = computed(() => clusters.value.filter((c) => c.entries.length > 1));
const singleEntries = computed(() =>
  clusters.value.filter((c) => c.entries.length === 1).map((c) => c.entries[0]!),
);

const crossClusterOwners = computed(() => {
  const ownerMap: Record<string, string[]> = {};
  nameClusters.value.forEach((c) => {
    c.entries.forEach((e) => {
      const owner = ownerOf(e.repo);
      if (!ownerMap[owner]) ownerMap[owner] = [];
      ownerMap[owner]!.push(c.name);
    });
  });
  return Object.entries(ownerMap)
    .filter(([, names]) => names.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
});

const crossClusterOwnerSet = computed(
  () => new Set(crossClusterOwners.value.map(([owner]) => owner)),
);

const lastUpdated = computed(() => {
  if (!repos.value.length) return null;
  return repos.value.reduce(
    (latest, r) => (r.last_updated > latest ? r.last_updated : latest),
    repos.value[0]!.last_updated,
  );
});

const SOURCE_LABELS: Record<string, string> = {
  "label:bounty": "bounty",
  "label:💰 Bounty": "💰 bounty",
  "label:issuehunt-funded": "issuehunt",
  "label:opire-bounty": "opire",
  "bot:algora-io": "algora",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function ownerOf(repo: string) {
  return repo.split("/")[0] ?? "";
}

function nameOf(repo: string) {
  return repo.split("/")[1] ?? repo;
}
</script>

<template>
  <div class="w-full">
    <header class="mb-6">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-lg font-semibold">Bounty repositories</h2>
          <p class="text-sm text-gh-muted mt-0.5">
            Repositories observed with active bounty signals, collected twice daily.
          </p>
        </div>
        <div class="flex items-center gap-3 text-xs shrink-0 flex-wrap">
          <span
            v-if="!pending"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gh-card border border-gh-border font-medium text-gh-text"
          >
            <span class="i-lucide:database w-3 h-3" />
            {{ repos.length }} repos
          </span>
          <span
            v-if="!pending && nameClusters.length"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gh-card border border-yellow-400/30 font-medium text-yellow-400"
          >
            <span class="i-lucide:layers w-3 h-3" />
            {{ nameClusters.length }} name clusters
          </span>
          <span
            v-if="!pending && crossClusterOwners.length"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gh-card border border-orange-400/30 font-medium text-orange-400"
          >
            <span class="i-lucide:git-branch w-3 h-3" />
            {{ crossClusterOwners.length }} shared accounts
          </span>
          <span v-if="lastUpdated" class="text-gh-muted">
            Updated <NuxtTime :datetime="lastUpdated" relative />
          </span>
        </div>
      </div>

      <div class="mt-4 relative">
        <span
          class="i-lucide:search absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gh-muted pointer-events-none"
        />
        <input
          v-model="search"
          type="text"
          placeholder="Filter repositories…"
          class="w-full bg-gh-card border border-gh-border rounded-lg pl-9 pr-4 py-2 text-sm text-gh-text placeholder:text-gh-muted/60 focus:outline-none focus:border-gh-border-light transition-colors"
        />
      </div>
    </header>

    <div v-if="pending" class="flex flex-wrap gap-2">
      <div
        v-for="i in 24"
        :key="i"
        class="h-7 rounded-full bg-gh-border animate-pulse"
        :style="{ width: `${70 + (i % 5) * 20}px` }"
      />
    </div>

    <div v-else-if="filteredRepos.length === 0" class="text-sm text-gh-muted">
      No repositories match "{{ search }}"
    </div>

    <template v-else>
      <!-- Name clusters -->
      <div v-if="nameClusters.length" class="mb-8">
        <h3 class="text-xs font-medium text-gh-muted uppercase tracking-wider mb-3">
          Name clusters
        </h3>
        <div class="space-y-2">
          <div
            v-for="cluster in nameClusters"
            :key="cluster.name"
            class="rounded-lg border border-gh-border/60 bg-white/1 p-3"
          >
            <div class="flex items-center gap-2 mb-2.5">
              <span class="text-sm font-medium text-gh-text">{{ cluster.name }}</span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full bg-gh-border text-gh-muted font-medium tabular-nums"
              >
                {{ cluster.entries.length }} owners
              </span>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <a
                v-for="entry in cluster.entries"
                :key="entry.repo"
                :href="`https://github.com/${entry.repo}`"
                target="_blank"
                rel="noopener noreferrer"
                :class="[
                  'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all',
                  crossClusterOwnerSet.has(ownerOf(entry.repo))
                    ? 'border-orange-400/40 bg-orange-400/5 text-orange-300 hover:bg-orange-400/10'
                    : 'border-gh-border/40 bg-white/2 text-gh-muted hover:text-gh-text hover:border-gh-border/60',
                ]"
              >
                {{ ownerOf(entry.repo) }}
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Accounts in multiple clusters -->
      <div v-if="crossClusterOwners.length" class="mb-8">
        <h3 class="text-xs font-medium text-gh-muted uppercase tracking-wider mb-3">
          Accounts in multiple clusters
        </h3>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="[owner, names] in crossClusterOwners"
            :key="owner"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-orange-400/30 bg-orange-400/5"
          >
            <a
              :href="`https://github.com/${owner}`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-orange-300 hover:text-orange-200 transition-colors font-medium"
            >
              {{ owner }}
            </a>
            <span class="text-gh-border">·</span>
            <span class="text-gh-muted/70">{{ names.join(", ") }}</span>
          </div>
        </div>
      </div>

      <!-- Unique repos -->
      <div v-if="singleEntries.length">
        <h3 class="text-xs font-medium text-gh-muted uppercase tracking-wider mb-3">
          Unique repos
        </h3>
        <div class="flex flex-wrap gap-2">
          <a
            v-for="entry in singleEntries"
            :key="entry.repo"
            :href="`https://github.com/${entry.repo}`"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-gh-border/40 bg-white/2 hover:bg-white/4 hover:border-gh-border/60 transition-all group"
          >
            <span class="text-gh-muted group-hover:text-gh-text/60 transition-colors"
              >{{ ownerOf(entry.repo) }}/</span
            ><span class="text-gh-text font-medium">{{ nameOf(entry.repo) }}</span>
            <span class="ml-0.5 text-gh-muted/50 text-[10px]">{{
              sourceLabel(entry.sources[0] ?? "")
            }}</span>
          </a>
        </div>
      </div>
    </template>

    <p
      v-if="!pending && filteredRepos.length > 0 && search"
      class="mt-4 text-xs text-gh-muted"
    >
      {{ filteredRepos.length }} of {{ repos.length }} repositories
    </p>
  </div>
</template>
