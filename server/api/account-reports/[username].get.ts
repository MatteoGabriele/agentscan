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

  const verifiedAutomation =
    verified.status === 'fulfilled'
      ? verified.value.find((account) => {
          return (
            account.username.toLowerCase() === username || account.id === id
          )
        })
      : undefined

  const automationTally =
    tally.status === 'fulfilled' && id !== undefined
      ? tally.value.find((entry) => entry.id === id)
      : undefined

  const integration =
    integrations.status === 'fulfilled'
      ? integrations.value.find((item) => {
          return item.username.toLowerCase() === username
        })
      : undefined

  return {
    verifiedAutomation: verifiedAutomation ?? null,
    automationTally: automationTally ?? null,
    integration: integration ?? null,
  }
})
