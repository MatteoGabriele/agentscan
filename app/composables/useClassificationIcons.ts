// @unocss-include
import type { IdentityClassification } from '@unveil/identity'

export function useClassificationIcons(
  classification: MaybeRefOrGetter<IdentityClassification | undefined>,
) {
  const classificationIcon = computed<string>(() => {
    const classificationValue = toValue(classification)

    if (classificationValue === 'insufficient-data') {
      return 'i-lucide:circle-slash'
    }

    if (classificationValue === 'organic') {
      return 'i-lucide:heart-handshake'
    }

    if (classificationValue === 'mixed') {
      return 'i-lucide:blend'
    }

    return 'i-lucide:shield-alert'
  })

  return {
    classificationIcon,
  }
}
