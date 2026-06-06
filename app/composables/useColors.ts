import {
  computed,
  shallowRef,
  type ComputedRef,
  type Ref,
  type ShallowRef,
  unref,
  watch,
} from "vue";
import { usePreferredDark } from "@vueuse/core";

type CssVariableSource =
  | HTMLElement
  | null
  | undefined
  | Ref<HTMLElement | null | undefined>;

type UseCssVariableOptions = {
  element?: CssVariableSource;
};

function readCssVariable(element: HTMLElement, variableName: string): string {
  return getComputedStyle(element).getPropertyValue(variableName).trim();
}

function toCamelCase(cssVariable: string): string {
  return cssVariable
    .replace(/^--/, "")
    .replace(/-([a-z0-9])/gi, (_, c) => c.toUpperCase());
}

function resolveElement(element?: CssVariableSource): HTMLElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  if (!element) return document.documentElement;

  const resolved = unref(element);

  return resolved ?? document.documentElement;
}

export function useCssVariables(
  variables: readonly string[],
  options: UseCssVariableOptions = {},
): { colors: ComputedRef<Record<string, string>> } {
  const recomputeToken = shallowRef(0);
  const isPreferredDark = usePreferredDark();

  const invalidateColors = () => {
    recomputeToken.value += 1;
  };

  watch(isPreferredDark, invalidateColors);

  const elementComputed = computed(() => resolveElement(options.element));

  const colors = computed<Record<string, string>>(() => {
    void recomputeToken.value;

    const element = elementComputed.value;
    if (!element) return {};

    const result: Record<string, string> = {};

    for (const variable of variables) {
      result[toCamelCase(variable)] = readCssVariable(element, variable);
    }

    return result;
  });

  return { colors };
}

export function useColors(
  element: ShallowRef<HTMLElement | null, HTMLElement | null>,
) {
  const { colors } = useCssVariables(
    [
      "--bg",
      "--card",
      "--border",
      "--border-light",
      "--text",
      "--text-transparent",
      "--text-muted",
      "--blue",
      "--green",
      "--green-line",
      "--green-hover",
      "--text-green",
      "--green-bg",
      "--danger",
      "--danger-hover",
      "--danger-bg",
      "--red",
      "--red-hover",
      "--red-bg",
      "--amber",
      "--event-fork",
      "--event-branch",
      "--event-pr",
      "--event-comment",
      "--event-organic-pr",
      "--event-organic-branch",
      "--event-organic-fork",
      "--event-organic-comment",
      "--event-mixed-pr",
      "--event-mixed-branch",
      "--event-mixed-fork",
      "--event-mixed-comment",
      "--event-automation-pr",
      "--event-automation-branch",
      "--event-automation-fork",
      "--event-automation-comment",
    ],
    {
      element,
    },
  );

  return colors;
}
