<script setup lang="ts">
definePageMeta({
  layout: "minimal",
});
</script>

<template>
  <h1 class="text-2xl font-semibold">Privacy Policy</h1>
  <p class="mt-2 text-sm text-gray-500">Last updated: March 2026</p>

  <p class="mt-6 text-sm leading-relaxed">
    Welcome to AgentScan. We are committed to protecting your privacy. This
    policy explains what data we collect, how we use it, and your rights
    regarding your information.
  </p>

  <section class="mt-10">
    <h2 class="text-base font-semibold">What we collect</h2>
    <p class="mt-2 text-sm leading-relaxed">
      Nothing. AgentScan does not collect, store, or process any personal data.
      There are no accounts, no cookies, no tracking, and no analytics.
    </p>
  </section>

  <section class="mt-8">
    <h2 class="text-base font-semibold">GitHub data</h2>
    <p class="mt-2 text-sm leading-relaxed">
      AgentScan only accesses public GitHub data — the same information anyone
      can see by visiting a GitHub profile. When you search for a username, we
      fetch their public events and profile from the GitHub API and analyze them
      in real time. Nothing is stored after the request is complete.
    </p>
  </section>

  <section class="mt-8">
    <h2 class="text-base font-semibold">Cookies</h2>
    <p class="mt-2 text-sm leading-relaxed">
      AgentScan does not use cookies of any kind — no session cookies, no
      tracking cookies, no analytics cookies.
    </p>
  </section>

  <section class="mt-8">
    <h2 class="text-base font-semibold">Third parties</h2>
    <p class="mt-2 text-sm leading-relaxed">
      AgentScan uses the following third-party services:
    </p>
    <ul class="mt-2 space-y-1 text-sm leading-relaxed list-disc list-inside">
      <li>
        <strong>GitHub API</strong> — to fetch public profile and activity data
      </li>
      <li>
        <strong>Netlify</strong> — for hosting and serving the application
      </li>
    </ul>
    <p class="mt-3 text-sm leading-relaxed">
      We do not share any data with advertisers or other third parties.
    </p>
  </section>

  <section class="mt-8">
    <h2 class="text-base font-semibold">Verified accounts list</h2>
    <p class="mt-2 text-sm leading-relaxed">
      AgentScan maintains a curated list of manually verified automated
      accounts. This list is public, stored directly in the open source
      repository, and only contains GitHub usernames along with a reason and a
      link to the original report. If you believe your account has been
      incorrectly listed, you can dispute it by opening the linked issue on
      GitHub.
    </p>
  </section>

  <section class="mt-8">
    <h2 class="text-base font-semibold">Your rights</h2>
    <p class="mt-2 text-sm leading-relaxed">
      Since we do not collect any personal data, there is nothing to access,
      export, or delete. If your GitHub account appears in our verified list and
      you believe it was added in error, you can dispute it via the linked
      GitHub issue.
    </p>
  </section>

  <section class="mt-8">
    <h2 class="text-base font-semibold">Open source</h2>
    <p class="mt-2 text-sm leading-relaxed">
      AgentScan is open source. You can read the full code to verify exactly
      what the app does. If you have a concern, open an issue on the GitHub
      repository.
    </p>
  </section>

  <section class="mt-8">
    <h2 class="text-base font-semibold">Changes to this policy</h2>
    <p class="mt-2 text-sm leading-relaxed">
      We may update this privacy policy from time to time. Any changes will be
      published on this page with an updated revision date.
    </p>
  </section>
</template>
