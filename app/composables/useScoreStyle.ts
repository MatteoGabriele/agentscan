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
  hasTally?: boolean
}

const mixed = {
  text: 'text-ui-mixed',
  border: 'border-ui-mixed',
  background: 'bg-ui-mixed',
}

const automation = {
  text: 'text-ui-automation',
  border: 'border-ui-automation',
  background: 'bg-ui-automation',
}

const organic = {
  text: 'text-ui-organic',
  border: 'border-ui-organic',
  background: 'bg-ui-organic',
}

const insufficient = {
  text: 'text-ui-muted',
  border: 'border-ui-border',
  background: 'bg-ui-border',
}

export function useScoreStyle(
  classification: MaybeRefOrGetter<IdentityClassification | undefined>,
  options?: MaybeRefOrGetter<UseScoreStyleOptions>,
): UseScoreStyle {
  const scoreStyle = computed<ScoreStyle>(() => {
    const value = toValue(classification)
    const opts = toValue(options)

    if (value === 'automation' || opts?.hasCommunityFlag) {
      return automation
    } else if (value === 'mixed' || opts?.hasActivityReport || opts?.hasTally) {
      return mixed
    } else if (value === 'organic') {
      return organic
    } else {
      return insufficient
    }
  })

  return {
    scoreStyle,
  }
}
