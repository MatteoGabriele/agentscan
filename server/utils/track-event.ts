const SA_EVENTS_URL = 'https://queue.simpleanalyticscdn.com/events'
const SA_HOSTNAME = 'agentscan.tools'
const SA_USER_AGENT = 'AgentScanServer/1.0 (+https://agentscan.tools)'

export async function trackServerEvent(
  name: string,
  metadata?: Record<string, string | number>,
): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  try {
    await fetch(SA_EVENTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': SA_USER_AGENT,
      },
      body: JSON.stringify({
        type: 'event',
        hostname: SA_HOSTNAME,
        event: name,
        ua: SA_USER_AGENT,
        metadata,
      }),
    })
  } catch {
    // best-effort tracking, ignore delivery failures
  }
}
