import { useEventListener } from "@vueuse/core";

type OnPaste = (pasted: string, ctx: { event: ClipboardEvent }) => void;

export function usePaste(
  element: MaybeRefOrGetter<HTMLElement | null | undefined>,
  onPaste: OnPaste,
) {
  useEventListener(element, "paste", (event) => {
    const clipboard = (event.clipboardData || ("clipboardData" in window && window.clipboardData)) as typeof event.clipboardData;
    if (!clipboard) {
      if (import.meta.dev) {
        console.warn("[usePaste] Clipboard API not supported in this browser.");
      }
      return;
    }
    const pasted = clipboard.getData("text");
    onPaste(pasted, { event });
  });
}
