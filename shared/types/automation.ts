export type VerifiedAutomation = {
  username: string
  id: number
  reason: string
  issueUrl: string
  createdAt: string
  reportedBy: string
  /**
   * Reviewers whose 👍 carried the report. Optional: entries added before the
   * review workflow started recording votes have none.
   */
  approvedBy?: string[]
}

export type AutomationTally = [string, number]
