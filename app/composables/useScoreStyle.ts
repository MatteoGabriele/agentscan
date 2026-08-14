// @unocss-include
import type { IdentityClassification } from '@unveil/identity'

type ScoreStyle = {
  text: string
  border: string
  background: string
}

type UseScoreStyle = {
  scoreStyle: ComputedRef<ScoreStyle>
}

type UseScoreStyleOptions = {
  hasCommunityFlag?: boolean
  hasActivityReport?: boolean
}

export function useScoreStyle(
  classification: MaybeRefOrGetter<IdentityClassification | undefined>,
  options?: MaybeRefOrGetter<UseScoreStyleOptions>,
): UseScoreStyle {
  const scoreStyle = computed<ScoreStyle>(() => {
    const classificationValue = toValue(classification)
    const opts = toValue(options)

    if (opts?.hasCommunityFlag) {
      return {
        text: 'text-ui-automation',
        border: 'border-ui-automation',
        background: 'bg-ui-automation',
      }
    }

    if (!classificationValue || classificationValue === 'insufficient-data') {
      return {
        text: 'text-ui-muted',
        border: 'border-ui-border',
        background: 'bg-ui-bg',
      }
    }

    if (classificationValue === 'automation') {
      return {
        text: 'text-ui-automation',
        border: 'border-ui-automation',
        background: 'bg-ui-automation',
      }
    }

    if (classificationValue === 'mixed' || opts?.hasActivityReport) {
      return {
        text: 'text-ui-mixed',
        border: 'border-ui-mixed',
        background: 'bg-ui-mixed',
      }
    }

    return {
      text: 'text-ui-organic',
      border: 'border-ui-organic',
      background: 'bg-ui-organic',
    }
  })

  return {
    scoreStyle,
  }
}
