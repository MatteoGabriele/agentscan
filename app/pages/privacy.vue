<template>
  <div class="mx-auto max-w-2xl px-6 py-16">
    <h1 class="text-2xl font-semibold">Privacy Policy</h1>
    <p class="mt-2 text-sm text-gray-500">Last updated: February 2026</p>

    <p class="mt-6 text-sm leading-relaxed">
      Welcome to AgentScan. We are committed to protecting your privacy. This
      policy explains what data we collect, how we use it, and your rights
      regarding your information.
    </p>

    <section class="mt-10">
      <h2 class="text-base font-semibold">What are cookies?</h2>
      <p class="mt-2 text-sm leading-relaxed">
        Cookies are small text files stored on your device when you visit a
        website. Their purpose is to enhance your browsing experience by
        remembering certain preferences and settings.
      </p>
    </section>

    <section class="mt-8">
      <h2 class="text-base font-semibold">What cookies do we use?</h2>
      <p class="mt-2 text-sm leading-relaxed">
        We only use essential technical cookies for purposes strictly necessary
        for the site's functionality. We do not use third-party or advertising
        cookies.
      </p>
      <ul class="mt-3 space-y-3 text-sm leading-relaxed">
        <li>
          <code class="text-xs">atproto_did</code> — This is our secure session
          cookie. It stores your Bluesky DID (a public identifier) when you sign
          in with your Bluesky account. It is essential for maintaining your
          authenticated session and associating your flags with your identity.
          It does not track you.
        </li>
        <li>
          <code class="text-xs">auth_redirect</code> — A short-lived cookie used
          to return you to the page you were on before signing in. It expires
          after 10 minutes and contains only a URL path.
        </li>
      </ul>
    </section>

    <section class="mt-8">
      <h2 class="text-base font-semibold">Managing cookies</h2>
      <p class="mt-2 text-sm leading-relaxed">
        You can configure your browser to accept, reject, or delete cookies
        according to your preferences. However, please note that rejecting
        essential cookies will prevent you from signing in and using the
        flagging feature.
      </p>
      <ul class="mt-3 space-y-1 text-sm leading-relaxed">
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            class="underline"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox"
            target="_blank"
            class="underline"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            class="underline"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>
    </section>

    <section class="mt-8">
      <h2 class="text-base font-semibold">Authenticated users</h2>
      <p class="mt-2 text-sm leading-relaxed">
        When you sign in with your Bluesky account, we request the minimum
        possible permission — only the ability to write a single record type
        (<code class="text-xs">app.netlify.agentscan.reaction</code>) to your
        own Bluesky personal data store. We cannot read your DMs, post on your
        behalf, access your follows, or perform any other action with your
        account.
      </p>
      <p class="mt-3 text-sm leading-relaxed">
        Your OAuth session tokens are stored securely in our database and are
        never shared. You can sign out at any time, which will clear your
        session cookie.
      </p>
    </section>

    <section class="mt-8">
      <h2 class="text-base font-semibold">Flagging & AT Proto data</h2>
      <p class="mt-2 text-sm leading-relaxed">
        When you flag a GitHub account, a record is written to
        <strong>your own</strong>
        Bluesky personal data store (PDS). This record is public by design — it
        is part of the AT Proto open protocol and can be read by anyone querying
        your PDS directly.
      </p>
    </section>

    <section class="mt-8">
      <h2 class="text-base font-semibold">Data retention</h2>
      <p class="mt-2 text-sm leading-relaxed">
        Session cookies are cleared when you sign out or after a period of
        inactivity. Your Bluesky DID and flag associations are stored in our
        database for as long as you have an active session or active flags. Flag
        records on AT Proto are subject to the protocol's own retention
        characteristics as described above.
      </p>
    </section>

    <section class="mt-8">
      <h2 class="text-base font-semibold">Your rights</h2>
      <p class="mt-2 text-sm leading-relaxed">You have the right to:</p>
      <ul class="mt-2 space-y-1 text-sm leading-relaxed list-disc list-inside">
        <li>Access information about what data we collect</li>
        <li>Sign out and clear your session at any time</li>
        <li>Unflag any account you have previously flagged</li>
        <li>Request information about our data practices</li>
      </ul>
      <p class="mt-3 text-sm leading-relaxed">
        Since we do not collect personal data beyond your public Bluesky DID,
        there is typically no personal information to delete or export.
      </p>
    </section>

    <section class="mt-8">
      <h2 class="text-base font-semibold">Contact us</h2>
      <p class="mt-2 text-sm leading-relaxed">
        For any questions or concerns about this privacy policy, you can contact
        us by opening an issue on our GitHub repository.
      </p>
    </section>

    <section class="mt-8">
      <h2 class="text-base font-semibold">Changes to this policy</h2>
      <p class="mt-2 text-sm leading-relaxed">
        We may update this privacy policy from time to time. Any changes will be
        published on this page with an updated revision date.
      </p>
    </section>
  </div>
</template>
