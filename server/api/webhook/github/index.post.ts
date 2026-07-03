import { App } from 'octokit'
import { Webhooks } from '@octokit/webhooks'
import {
  getClassificationDetails,
  identify,
  type IdentifyResult,
  type IdentityClassification,
} from '@unveil/identity'
import { isKnownBot } from '~~/shared/cicd-known-bots'
import {
  DEFAULT_CONFIG,
  parseRepoConfig,
  type AuthorAssociation,
  type RepoConfig,
} from './_config'

type AutomationListItem = {
  username: string
  reason: string
  createdAt: string
  issueUrl: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({ statusCode: 400, message: 'Empty body' })
  }

  if (!config.githubWebhookSecret) {
    throw createError({
      statusCode: 503,
      message: 'Webhook secret not configured',
    })
  }

  const webhooks = new Webhooks({
    secret: config.githubWebhookSecret,
  })

  const signature = getHeader(event, 'x-hub-signature-256')

  if (!signature) {
    throw createError({ statusCode: 401, message: 'Invalid signature' })
  }

  const isSignatureValid = await webhooks.verify(rawBody, signature)

  if (!isSignatureValid) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const payload = JSON.parse(rawBody)

  if (payload.action !== 'opened' && payload.action !== 'reopened') {
    return { ok: true }
  }

  if (!payload.installation) {
    return { ok: true }
  }

  const isPR = !!payload.pull_request
  const isIssue = !!payload.issue

  const targetNumber: number | undefined =
    payload.pull_request?.number ?? payload.issue?.number
  const username: string | undefined =
    payload.pull_request?.user?.login ?? payload.issue?.user?.login
  const rawAuthorAssociation: string | undefined =
    payload.pull_request?.author_association ??
    payload.issue?.author_association
  const authorAssociation = rawAuthorAssociation?.toLowerCase() as
    | AuthorAssociation
    | undefined

  if (!targetNumber || !username) {
    return { ok: true }
  }

  if (!config.githubAppId || !config.githubAppPrivateKey) {
    throw createError({ statusCode: 503, message: 'GitHub App not configured' })
  }

  const privateKey = Buffer.from(config.githubAppPrivateKey, 'base64').toString(
    'utf-8',
  )

  const app = new App({
    appId: config.githubAppId,
    privateKey,
    webhooks: { secret: config.githubWebhookSecret },
    Octokit: TrackedOctokit,
  })

  const octokit = await app.getInstallationOctokit(payload.installation.id)

  const owner: string = payload.repository.owner.login
  const repo: string = payload.repository.name

  let repoConfig: RepoConfig = DEFAULT_CONFIG
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.github/agentscan.yml',
    })
    if ('content' in data) {
      repoConfig = parseRepoConfig(
        Buffer.from(data.content, 'base64').toString('utf-8'),
      )
    }
  } catch {
    // no config file — use defaults
  }

  let checkRunId: number | undefined
  if (isPR) {
    try {
      const { data: checkRun } = await octokit.rest.checks.create({
        owner,
        repo,
        name: 'AgentScan',
        head_sha: payload.pull_request.head.sha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        output: {
          title: 'Analyzing contributor activity',
          summary: `AgentScan is analyzing @${username}'s public activity for automation signals.`,
        },
      })
      checkRunId = checkRun.id
    } catch {
      // checks:write permission not granted — continue without a check run
    }
  }

  type CheckConclusion = 'success' | 'action_required' | 'failure'

  const completeCheckRun = async (
    conclusion: CheckConclusion,
    title: string,
    summary: string,
  ) => {
    if (!checkRunId) {
      return
    }
    await octokit.rest.checks
      .update({
        owner,
        repo,
        check_run_id: checkRunId,
        status: 'completed',
        conclusion,
        completed_at: new Date().toISOString(),
        details_url: `https://agentscan.tools/user/${username}`,
        output: { title, summary },
      })
      .catch(() => {
        // check run update failed — nothing further we can do
      })
  }

  if (isPR && !repoConfig.scan['pull-requests']) {
    await completeCheckRun(
      'success',
      'Analysis skipped',
      'PR scanning is disabled for this repository.',
    )
    return { ok: true }
  }

  if (isIssue && !repoConfig.scan.issues) {
    return { ok: true }
  }

  if (
    repoConfig['allowed-users'].includes(username) ||
    isKnownBot(username) ||
    (authorAssociation &&
      repoConfig['trusted-author-associations'].includes(authorAssociation))
  ) {
    await completeCheckRun(
      'success',
      'Analysis skipped',
      'This contributor is exempt from analysis (allow-listed, a known automation, or a trusted author association).',
    )
    return { ok: true }
  }

  try {
    const { data: user } = await octokit.rest.users.getByUsername({ username })

    const responses = await Promise.all(
      Array.from({ length: 3 }, (_, index) =>
        octokit.rest.activity.listPublicEventsForUser({
          username,
          per_page: 100,
          page: index + 1,
        }),
      ),
    )
    const events = responses.flatMap((r) => r.data)

    let verified: AutomationListItem[] = []
    try {
      const { data: verifiedList } = await app.octokit.rest.repos.getContent({
        owner: 'matteogabriele',
        repo: 'agentscan',
        path: 'data/verified-automations-list.json',
      })

      if ('content' in verifiedList) {
        verified = JSON.parse(
          Buffer.from(verifiedList.content, 'base64').toString('utf-8'),
        ) as AutomationListItem[]
      }
    } catch {
      // list unavailable — continue without it
    }

    const hasCommunityFlag = verified.some((a) => a.username === username)

    const analysis: IdentifyResult = identify({
      accountName: username,
      reposCount: user.public_repos,
      createdAt: user.created_at,
      events,
    })

    const isFlagged = hasCommunityFlag || analysis.classification !== 'organic'

    const statusIndicators: Record<IdentityClassification, string> = {
      organic: '✅',
      mixed: '⚠️',
      automation: '❌',
    }

    const indicator = hasCommunityFlag
      ? '🚩'
      : statusIndicators[analysis.classification]
    const details = hasCommunityFlag
      ? {
          label: 'Flagged by community',
          description:
            'This account has been flagged as potentially automated by the community.',
        }
      : getClassificationDetails(analysis.classification)

    let description = details.description
    if (hasCommunityFlag && repoConfig.messages['community-flagged']) {
      description = repoConfig.messages['community-flagged']
    } else if (
      !hasCommunityFlag &&
      repoConfig.messages[analysis.classification]
    ) {
      description = repoConfig.messages[analysis.classification]
    }

    const shouldAutoClose =
      repoConfig['auto-close'] &&
      (hasCommunityFlag ||
        repoConfig['auto-close-classifications'].includes(
          analysis.classification,
        ))

    const checkConclusion: CheckConclusion = shouldAutoClose
      ? 'action_required'
      : 'success'

    if (
      !repoConfig['comment-on-organic'] &&
      !hasCommunityFlag &&
      analysis.classification === 'organic'
    ) {
      await completeCheckRun(checkConclusion, details.label, description)
      return { ok: true }
    }

    if (repoConfig.mode === 'silent') {
      await completeCheckRun(
        'success',
        'Analysis skipped',
        'AgentScan is configured in silent mode for this repository.',
      )
      return { ok: true }
    }

    const MARKER = '<!-- agentscanapp-bot -->'

    const body = [
      MARKER,
      `### ${indicator} ${details.label}`,
      '',
      description,
      '',
      `[View full analysis →](https://agentscan.tools/user/${username})`,
      '',
      '<sub>This is an automated analysis by [AgentScan](https://agentscan.tools)</sub>',
    ].join('\n')

    try {
      if (repoConfig.mode === 'full' || repoConfig.mode === 'comment') {
        const { data: existingComments } =
          await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: targetNumber,
            per_page: 100,
          })

        const existing = existingComments.find((c) => c.body?.includes(MARKER))

        if (existing) {
          await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: existing.id,
            body,
          })
        } else {
          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: targetNumber,
            body,
          })
        }
      }

      if (repoConfig.mode === 'full' || repoConfig.mode === 'labels') {
        const labelsToAdd: string[] = []

        if (hasCommunityFlag) {
          labelsToAdd.push(repoConfig.labels['community-flagged'])
        } else if (analysis.classification !== 'organic') {
          const labelMap: Record<
            Exclude<IdentityClassification, 'organic'>,
            string
          > = {
            mixed: repoConfig.labels.mixed,
            automation: repoConfig.labels.automation,
          }
          labelsToAdd.push(labelMap[analysis.classification])
        }

        if (labelsToAdd.length > 0) {
          await Promise.all(
            labelsToAdd.map((name) =>
              octokit.rest.issues
                .createLabel({ owner, repo, name, color: 'ededed' })
                .catch(() => {
                  // label already exists or no create permission — continue to addLabels
                }),
            ),
          )
          await octokit.rest.issues.addLabels({
            owner,
            repo,
            issue_number: targetNumber,
            labels: labelsToAdd,
          })
        }
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        !err.message.includes('Resource not accessible')
      ) {
        throw err
      }
    }

    if (shouldAutoClose) {
      try {
        await octokit.rest.issues.update({
          owner,
          repo,
          issue_number: targetNumber,
          state: 'closed',
          state_reason: 'not_planned',
        })
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          !err.message.includes('Resource not accessible')
        ) {
          throw err
        }
      }
    }

    await completeCheckRun(checkConclusion, details.label, description)

    return {
      ok: true,
      flagged: isFlagged,
      classification: analysis.classification,
    }
  } catch (err) {
    await completeCheckRun(
      'failure',
      'Analysis failed',
      'AgentScan encountered an error while analyzing this contributor.',
    )
    throw err
  }
})
