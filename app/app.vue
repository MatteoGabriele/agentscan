<script setup lang="ts">
const accountName = ref("");
const queryUser = ref("");

const { data, execute, status, error } = useFetch("/api/user", {
  query: { user: queryUser },
  immediate: false,
  watch: false,
});

function handleSubmit() {
  if (!accountName.value.trim()) return;
  queryUser.value = accountName.value.trim();
  execute();
}

const scoreColor = computed(() => {
  if (!data.value?.analysis) return "gray";
  const score = data.value.analysis.score;
  if (score >= 70) return "#22c55e"; // green - human
  if (score >= 50) return "#f59e0b"; // amber - suspicious
  return "#ef4444"; // red - likely bot
});

const classificationLabel = computed(() => {
  if (!data.value?.analysis) return "";
  const c = data.value.analysis.classification;
  if (c === "likely_bot") return "Likely Bot";
  if (c === "suspicious") return "Suspicious";
  return "Human";
});
</script>

<template>
  <div class="container">
    <header>
      <h1>AgentScan</h1>
      <p class="subtitle">Detect suspicious AI agents activities on GitHub</p>
    </header>

    <form @submit.prevent="handleSubmit" class="search-form">
      <input
        v-model="accountName"
        type="text"
        placeholder="Enter GitHub username..."
        :disabled="status === 'pending'"
      />
      <button
        type="submit"
        :disabled="status === 'pending' || !accountName.trim()"
      >
        {{ status === "pending" ? "Analyzing..." : "Analyze" }}
      </button>
    </form>

    <div v-if="status === 'pending'" class="loading">
      <div class="spinner"></div>
      <p>Analyzing @{{ queryUser }}...</p>
    </div>

    <div v-else-if="error" class="error-box">
      <p>❌ {{ error.data?.message || "Failed to analyze user" }}</p>
    </div>

    <div v-else-if="data?.analysis" class="results">
      <!-- User Card -->
      <div class="user-card">
        <img :src="data.user.avatar" :alt="data.user.login" class="avatar" />
        <div class="user-info">
          <h2>{{ data.user.name || data.user.login }}</h2>
          <p class="username">@{{ data.user.login }}</p>
          <p v-if="data.user.bio" class="bio">{{ data.user.bio }}</p>
          <div class="stats">
            <span>{{ data.user.followers }} followers</span>
            <span>{{ data.user.repos }} repos</span>
            <span>{{ data.analysis.profile.age }} days old</span>
          </div>
        </div>
      </div>

      <!-- Score -->
      <div class="score-card" :style="{ borderColor: scoreColor }">
        <div class="score-circle" :style="{ background: scoreColor }">
          {{ data.analysis.score }}
        </div>
        <div class="score-info">
          <h3 :style="{ color: scoreColor }">{{ classificationLabel }}</h3>
          <p>Based on {{ data.eventCount }} recent events</p>
        </div>
      </div>

      <!-- Flags -->
      <div v-if="data.analysis.flags.length > 0" class="flags">
        <h3>🚩 Detection Flags</h3>
        <ul>
          <li v-for="flag in data.analysis.flags" :key="flag.label">
            <strong>{{ flag.label }}</strong>
            <span class="points">+{{ flag.points }}</span>
            <span class="detail">{{ flag.detail }}</span>
          </li>
        </ul>
      </div>

      <div v-else class="no-flags">
        <p>✅ No suspicious patterns detected</p>
      </div>
    </div>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #0d1117;
  color: #c9d1d9;
  min-height: 100vh;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
}

header h1 {
  font-size: 2rem;
  color: #fff;
}

.subtitle {
  color: #8b949e;
  margin-top: 0.5rem;
}

.search-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.search-form input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #30363d;
  border-radius: 6px;
  background: #161b22;
  color: #c9d1d9;
  font-size: 1rem;
}

.search-form input:focus {
  outline: none;
  border-color: #58a6ff;
}

.search-form button {
  padding: 0.75rem 1.5rem;
  background: #238636;
  border: none;
  border-radius: 6px;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.search-form button:hover:not(:disabled) {
  background: #2ea043;
}

.search-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #30363d;
  border-top-color: #58a6ff;
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-box {
  background: #3d1515;
  border: 1px solid #f85149;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.user-card {
  display: flex;
  gap: 1rem;
  background: #161b22;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #30363d;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}

.user-info h2 {
  color: #fff;
  font-size: 1.25rem;
}

.username {
  color: #8b949e;
  margin: 0.25rem 0;
}

.bio {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.stats {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #8b949e;
}

.score-card {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: #161b22;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid;
}

.score-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
}

.score-info h3 {
  font-size: 1.5rem;
}

.score-info p {
  color: #8b949e;
  margin-top: 0.25rem;
}

.flags {
  background: #161b22;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #30363d;
}

.flags h3 {
  margin-bottom: 1rem;
  color: #fff;
}

.flags ul {
  list-style: none;
}

.flags li {
  padding: 0.75rem 0;
  border-bottom: 1px solid #21262d;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.flags li:last-child {
  border-bottom: none;
}

.points {
  background: #f8514940;
  color: #f85149;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
}

.detail {
  color: #8b949e;
  font-size: 0.9rem;
}

.no-flags {
  background: #0d2818;
  border: 1px solid #238636;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  color: #3fb950;
}
</style>
