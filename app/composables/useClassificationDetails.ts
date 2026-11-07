import { getClassificationDetails } from '@unveil/identity/report'
import type { ClassificationLabel } from '@unveil/identity'
type ClassificationDetails = ReturnType<typeof getClassificationDetails>

export function useClassificationDetails(
  classification: MaybeRefOrGetter<ClassificationLabel | undefined>,
) {
  const classificationDetails = computed<ClassificationDetails>(() => {
    const classificationValue = toValue(classification)
    return getClassificationDetails(classificationValue)
  })

  return {
    classificationDetails,
  }
}
