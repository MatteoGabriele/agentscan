import {
  computed,
  type ComputedRef,
  type Ref,
  type ShallowRef,
  unref,
} from 'vue'

type CssVariableSource =
  HTMLElement | null | undefined | Ref<HTMLElement | null | undefined>

type UseCssVariableOptions = {
  element?: CssVariableSource
}

type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S

type CssVariableKey<S extends string> = S extends `--${infer Name}`
  ? CamelCase<Name>
  : CamelCase<S>

type CssVariables<T extends readonly string[]> = {
  [K in T[number] as CssVariableKey<K>]: string
}

function toCamelCase<T extends string>(cssVariable: T): CssVariableKey<T> {
  return cssVariable
    .replace(/^--/, '')
    .replace(/-([a-z0-9])/gi, (_, c: string) =>
      c.toUpperCase(),
    ) as CssVariableKey<T>
}

function resolveElement(element?: CssVariableSource): HTMLElement | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  if (!element) {
    return document.documentElement
  }

  const resolved = unref(element)

  return resolved ?? document.documentElement
}

export function useCssVariables<const T extends readonly string[]>(
  variables: T,
  options: UseCssVariableOptions = {},
): { colors: ComputedRef<CssVariables<T>> } {
  // color-mode writes `data-theme` on <html> synchronously in its own watcher,
  // which flushes before any render, so the new CSS values are already applied
  // by the time this computed re-reads them.
  const colorMode = useColorMode()

  const elementComputed = computed(() => resolveElement(options.element))

  const colors = computed<CssVariables<T>>(() => {
    void colorMode.value

    const element = elementComputed.value
    if (!element) {
      return {} as CssVariables<T>
    }

    const styles = getComputedStyle(element)
    const result: Record<string, string> = {}

    for (const variable of variables) {
      result[toCamelCase(variable)] = styles.getPropertyValue(variable).trim()
    }

    return result as CssVariables<T>
  })

  return { colors }
}

export function useColors(
  element: ShallowRef<HTMLElement | null, HTMLElement | null>,
) {
  const { colors } = useCssVariables(
    [
      '--bg',
      '--card-strong',
      '--border',
      '--text',
      '--text-muted',
      '--text-faint',
      '--organic',
      '--mixed',
      '--automation',
      '--event-organic-pr',
      '--event-organic-branch',
      '--event-organic-fork',
      '--event-organic-comment',
      '--event-mixed-pr',
      '--event-mixed-branch',
      '--event-mixed-fork',
      '--event-mixed-comment',
      '--event-automation-pr',
      '--event-automation-branch',
      '--event-automation-fork',
      '--event-automation-comment',
    ],
    {
      element,
    },
  )

  return colors
}
