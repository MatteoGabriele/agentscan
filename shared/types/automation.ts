export type AutomationReport = {
  username: string
  id: number
  reason: string
  issueUrl: string
  createdAt: string
  reportedBy: string
  approvedBy?: string[]
}

export type AutomationTally = [string, number]
