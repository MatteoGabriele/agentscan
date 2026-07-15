import type {
  EcosystemHealthWeeklyItem,
  EcosystemHealthCategoryProgression,
} from '~~/shared/types/ecosystem-health'

type WeeklyCountsEntry = {
  organic: { count: number; percentage: number; trend: number }
  mixed: { count: number; percentage: number; trend: number }
  automation: { count: number; percentage: number; trend: number }
  total: number
  automationClosure: EcosystemHealthWeeklyItem['automationClosure']
  createdAt: string
}

export default defineEventHandler(async () => {
  try {
    const raw = await useStorage('assets:data').getItemRaw('scan-results.json')

    if (!raw) {
      throw new Error('scan-results.json not found')
    }

    const content = Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw)
    const weeks: EcosystemHealthWeeklyItem[] = JSON.parse(content)

    const automationPercentages: number[] = []
    const mixedPercentages: number[] = []
    const organicPercentages: number[] = []

    const countsByDate: Record<string, WeeklyCountsEntry> = {}

    weeks.forEach((week) => {
      automationPercentages.push(week.automation.percentage)
      mixedPercentages.push(week.mixed.percentage)
      organicPercentages.push(week.organic.percentage)

      countsByDate[week.weekStart] = {
        organic: {
          count: week.organic.count,
          percentage: week.organic.percentage,
          trend: calcLinearProgression(organicPercentages).trend,
        },
        mixed: {
          count: week.mixed.count,
          percentage: week.mixed.percentage,
          trend: calcLinearProgression(mixedPercentages).trend,
        },
        automation: {
          count: week.automation.count,
          percentage: week.automation.percentage,
          trend: calcLinearProgression(automationPercentages).trend,
        },
        total: week.total,
        automationClosure: week.automationClosure,
        createdAt: week.createdAt,
      }
    })

    const dates = weeks.map((week) => week.weekStart)

    const categoryProgression: EcosystemHealthCategoryProgression = {
      automation: calcLinearProgression(automationPercentages),
      mixed: calcLinearProgression(mixedPercentages),
      organic: calcLinearProgression(organicPercentages),
    }

    // Use each week's own end date, not `createdAt` (which — for weeks written
    // in the same migration/compaction run — can be nearly identical timestamps).
    const scanTimes = weeks.map((week) => `${week.weekEnd}T00:00:00.000Z`)

    return {
      weeks,
      categoryProgression,
      countsByDate,
      dates,
      scanTimes,
    }
  } catch (error) {
    console.error('Ecosystem health fetch error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch verified automations list',
    })
  }
})
