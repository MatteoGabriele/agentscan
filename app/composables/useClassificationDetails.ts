export function useClassificationDetails(
  classification: MaybeRefOrGetter<IdentityClassification | undefined>,
) {
  const classificationDetails = computed(() => {
    const classificationValue = toValue(classification);

    if (classificationValue === "organic") {
      return {
        label: "Organic activity",
        description: "No automation signals detected in the analyzed events.",
      };
    }

    if (classificationValue === "mixed") {
      return {
        label: "Mixed activity",
        description:
          "Activity patterns show a mix of organic and automated signals.",
      };
    }

    return {
      label: "Automation signals",
      description: "Activity patterns show signs of automation.",
    };
  });

  return {
    classificationDetails,
  };
}
