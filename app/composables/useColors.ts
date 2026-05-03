import { computed, type ComputedRef, type Ref, unref } from "vue";
import { useSupported } from "@vueuse/core";

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
  if (typeof window === "undefined" || typeof document === "undefined")
    return null;
  if (!element) return document.documentElement;
  const resolved = unref(element);
  return resolved ?? document.documentElement;
}

/**
 * Read multiple CSS custom properties at once and expose them as a reactive object.
 *
 * Each CSS variable name is normalized into a camelCase key:
 * - Leading `--` is removed
 * - kebab-case is converted to camelCase
 *
 * Example:
 * ```ts
 * useCssVariables(['--bg', '--fg-subtle'])
 * // => colors.value = { bg: '...', fgSubtle: '...' }
 * ```
 *
 * The returned values are always resolved via `getComputedStyle`, meaning the
 * effective value is returned (after cascade, theme classes, etc.).
 *
 * Reactivity behavior:
 * - Updates automatically when the observed element changes
 * - Can react to theme toggles via `watchHtmlAttributes`
 * - Can react to responsive CSS variables via `watchResize`
 *
 * @param variables - List of CSS variable names (must include the leading `--`)
 * @param options - Configuration options
 * @param options.element - Element to read variables from (defaults to `:root`)
 *
 * @returns An object containing a reactive `colors` map, keyed by camelCase names
 */
export function useCssVariables(
  variables: readonly string[],
  options: UseCssVariableOptions = {},
): { colors: ComputedRef<Record<string, string>> } {
  const elementComputed = computed(() => resolveElement(options.element));

  const colors = computed<Record<string, string>>(() => {
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
