type SAEventName = string
type SAEventMetadata = Record<string, string | boolean | number | Date>

type SAEventFn = (s: SAEventName, metadata?: SAEventMetadata) => void

export function useSaEvent() {
  function trackEvent(eventName: SAEventName, metadata?: SAEventMetadata) {
    if (import.meta.client) {
      const fn = window.sa_event as SAEventFn | undefined
      fn?.(eventName, metadata)
    }
  }

  return {
    trackEvent,
  }
}
