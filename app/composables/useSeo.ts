export function useSeoUser(user: MaybeRefOrGetter<GitHubUser | undefined>) {
  const ogTitle = computed(() => {
    const userValue = toValue(user);
    const name = userValue?.name || userValue?.login;

    return `${name} | AgentScan`;
  });

  const ogImage = computed(() => {
    const userValue = toValue(user);
    return userValue?.avatar_url;
  });

  useHead({
    title: ogTitle,
    meta: () => [
      { property: "og:title", content: ogTitle },
      { property: "og:image", content: ogImage },
      { property: "og:type", content: "website" },
    ],
  });
}

export type UseSeoAnalysisOptions = {
  hasCommunityFlag?: MaybeRefOrGetter<boolean>;
};

export function useSeoAnalysis(
  analysis: MaybeRefOrGetter<IdentifyReplicantResult | undefined>,
  options?: UseSeoAnalysisOptions,
) {
  const ogDescription = computed(() => {
    const analysisValue = toValue(analysis);

    if (!analysisValue) {
      return;
    }

    const flagsCounter = analysisValue.flags.length;
    let descriptions = [];

    if (toValue(options?.hasCommunityFlag)) {
      descriptions.push(`Flagged by the community`);
    }

    if (flagsCounter > 0) {
      descriptions.push(
        `Has ${flagsCounter} flag${flagsCounter === 1 ? "" : "s"}`,
      );
    }

    return descriptions.join(" | ");
  });

  useHead({
    meta: () => [{ property: "og:description", content: ogDescription.value }],
  });
}
