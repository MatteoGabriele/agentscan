export function useSeoUser(user: MaybeRefOrGetter<GitHubUser | undefined>) {
  const ogTitle = computed<string | undefined>(() => {
    const userValue = toValue(user);

    if (!userValue) {
      return;
    }

    const name = userValue.name || userValue.login;

    return `${name} | AgentScan`;
  });

  const ogImage = computed<string | undefined>(() => {
    const userValue = toValue(user);
    if (!userValue) {
      return;
    }

    return userValue.avatar_url;
  });

  useHead({
    title: ogTitle,
    meta: () => {
      const metas = [{ property: "og:type", content: "website" }];

      if (ogImage.value) {
        metas.push({ property: "og:image", content: ogImage.value });
      }

      if (ogTitle.value) {
        metas.push({ property: "og:title", content: ogTitle.value });
      }

      return metas;
    },
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

    if (descriptions.length === 0) {
      return;
    }

    return descriptions.join(" | ");
  });

  useHead({
    meta: () => {
      return ogDescription.value
        ? [{ property: "og:description", content: ogDescription.value }]
        : [];
    },
  });
}
