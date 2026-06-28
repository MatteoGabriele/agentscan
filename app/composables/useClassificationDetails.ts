import { getClassificationDetails } from '@unveil/identity'
import type { IdentityClassification } from '@unveil/identity'
type ClassificationDetails = ReturnType<typeof getClassificationDetails>

export function useClassificationDetails(
  classification: MaybeRefOrGetter<IdentityClassification | undefined>,
) {
  const classificationDetails = computed<ClassificationDetails>(() => {
    const classificationValue = toValue(classification)
    return getClassificationDetails(classificationValue)
  })

  return {
    classificationDetails,
  }
}
