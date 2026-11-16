import type { VerifiedAutomation } from '~~/shared/types/automation'
import type { IntegrationItem } from '~~/shared/types/integrations'
import type { AutomationTallyResponse } from '~~/shared/types/logs-api'

// Returns the community report, scan tally and integration entries for one account.
export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')?.toLowerCase()

  if (!username) {
    throw createError({
      statusCode: 400,
      message: 'Missing username parameter',
    })
  }

  const id = Number(getQuery(event).id) || undefined

  // Settled independently so one failing source doesn't hide the others.
  const [verified, tally, integrations] = await Promise.allSettled([
    $fetch('/api/verified-automations'),
    $fetch('/api/automation-tally'),
    $fetch('/api/integration/unsafe-labs'),
  ])

  let verifiedAutomation: VerifiedAutomation | undefined

  if (verified.status === 'fulfilled') {
    verifiedAutomation = verified.value.find((account) => {
      return id === undefined
        ? account.username.toLowerCase() === username
        : account.id === id
    })
  }

  let automationTally: AutomationTallyResponse[number] | undefined

  if (tally.status === 'fulfilled' && id !== undefined) {
    automationTally = tally.value.find((entry) => entry.id === id)
  }

  let integration: IntegrationItem | undefined

  if (integrations.status === 'fulfilled') {
    integration = integrations.value.find((item) => {
      return item.username.toLowerCase() === username
    })
  }

  return {
    verifiedAutomation: verifiedAutomation ?? null,
    automationTally: automationTally ?? null,
    integration: integration ?? null,
  }
})
