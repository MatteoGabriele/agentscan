import { App } from 'octokit'
import { Webhooks } from '@octokit/webhooks'
import type { ClassificationLabel } from '@unveil/identity'
import { getClassificationDetails } from '@unveil/identity/report'
import { isGitHubAppAccount } from '@unveil/identity/providers/github'
import {
  DEFAULT_CONFIG,
  parseRepoConfig,
  type AuthorAssociation,
  type RepoConfig,
} from './_config'
import {
  buildEvidenceLines,
  buildReportIssueUrl,
} from '~~/shared/utils/report-issue'
import { COMMUNITY_FLAGGED_DETAILS } from '~~/shared/utils/agentscan-messages'
import {
  buildHoneypotComment,
  buildHoneypotResultComment,
  createHoneypotToken,
  extractHoneypotToken,
  hasHoneypotToken,
  HONEYPOT_RESULT_MARKER,
  isOwnComment,
} from './_honeypot'
import { analyze } from '@unveil/vk'

// Line-anchored so a mention mid-sentence doesn't trigger a scan.
const SCAN_COMMAND = /^\s*@agentscanapp\s+scan\b/im

const MAINTAINER_ASSOCIATIONS = ['OWNER', 'MEMBER', 'COLLABORATOR']

type OctokitAuthInstall = { token?: string } | undefined

// Under Netlify's 10s function timeout, leaving time to conclude the check run.
const CHECK_RUN_DEADLINE_MS = 8_000

// Encoded because bot logins (`dependabot[bot]`) make `details_url` invalid.
const profileUrl = (username: string) =>
  `https://agentscan.tools/user/${encodeURIComponent(username)}`

type AutomationListItem = {
  username: string
  reason: string
  createdAt: string
  issueUrl: string
}

type LabelMap = Record<
  Exclude<ClassificationLabel, 'organic' | 'insufficient-data'>,
  string
>

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

  // issue_comment events are the honeypot reply or the scan command.
  const isCommentEvent =
    payload.action === 'created' && !!payload.comment && !!payload.issue

  // Reopening never re-scans, so a maintainer can reopen an auto-closed PR
  // without it closing again. A maintainer re-runs the scan by command instead.
  const isScanCommand =
    isCommentEvent &&
    SCAN_COMMAND.test(payload.comment.body ?? '') &&
    MAINTAINER_ASSOCIATIONS.includes(payload.comment.author_association)

  if (payload.action !== 'opened' && !isCommentEvent) {
    return { ok: true }
  }

  if (!payload.installation) {
    return { ok: true }
  }

  // On issue_comment the PR lives under `issue`, distinguished by `pull_request`.
  const isPR = isCommentEvent
    ? !!payload.issue.pull_request
    : !!payload.pull_request

  const isIssue = isCommentEvent ? !payload.issue.pull_request : !!payload.issue

  const targetNumber: number | undefined =
    payload.pull_request?.number ?? payload.issue?.number

  const username: string | undefined =
    payload.pull_request?.user?.login ?? payload.issue?.user?.login

  const rawAuthorAssociation: string | undefined =
    payload.pull_request?.author_association ??
    payload.issue?.author_association

  const authorAssociation = rawAuthorAssociation?.toLowerCase() as
    AuthorAssociation | undefined

  // Both mean the author's first PR/issue on this repository.
  const isFirstTimeContributor =
    authorAssociation === 'first_timer' ||
    authorAssociation === 'first_time_contributor'

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
    // no config file. use defaults
  }

  if (isCommentEvent && !isScanCommand) {
    if (!repoConfig.honeypot) {
      return { ok: true }
    }

    // Only the PR/issue author can trigger their own trap.
    const commentAuthor: string | undefined = payload.comment.user?.login

    if (
      !commentAuthor ||
      commentAuthor !== username ||
      isGitHubAppAccount({ type: payload.comment.user?.type })
    ) {
      return { ok: true }
    }

    // Paginated so the bait comment is found on long threads.
    const comments = await octokit
      .paginate(octokit.rest.issues.listComments, {
        owner,
        repo,
        issue_number: targetNumber,
        per_page: 100,
      })
      .catch((err: unknown) => {
        if (
          err instanceof Error &&
          !err.message.includes('Resource not accessible')
        ) {
          throw err
        }
        // thread unreadable. no way to tell whether the trap was sprung
        return null
      })

    if (!comments) {
      return { ok: true }
    }

    // Only the app's own comments, so nobody can plant a marker with a code the
    // author might type anyway (e.g. a 12-character commit SHA).
    const ownComments = comments.filter((c) =>
      isOwnComment(c, config.githubAppId),
    )

    if (ownComments.some((c) => c.body?.includes(HONEYPOT_RESULT_MARKER))) {
      return { ok: true }
    }

    const token = ownComments
      .map((c) => extractHoneypotToken(c.body))
      .find((value): value is string => value !== null)

    if (!token || !hasHoneypotToken(payload.comment.body, token)) {
      return { ok: true }
    }

    let closed = false

    if (repoConfig['auto-close']) {
      try {
        await octokit.rest.issues.update({
          owner,
          repo,
          issue_number: targetNumber,
          state: 'closed',
          state_reason: 'not_planned',
        })
        closed = true
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          !err.message.includes('Resource not accessible')
        ) {
          throw err
        }
      }
    }

    try {
      if (repoConfig.mode === 'full' || repoConfig.mode === 'comment') {
        await octokit.rest.issues.createComment({
          owner,
          repo,
          issue_number: targetNumber,
          body: buildHoneypotResultComment({ username, isPR, closed }),
        })
      }

      if (repoConfig.mode === 'full' || repoConfig.mode === 'labels') {
        const label = repoConfig.labels.automation

        await octokit.rest.issues
          .createLabel({ owner, repo, name: label, color: 'ededed' })
          .catch(() => {
            // label already exists or no create permission
          })
        await octokit.rest.issues.addLabels({
          owner,
          repo,
          issue_number: targetNumber,
          labels: [label],
        })
      }
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        !err.message.includes('Resource not accessible')
      ) {
        throw err
      }
    }

    return { ok: true, honeypot: 'triggered' as const }
  }

  let checkRunId: number | undefined
  if (isPR) {
    try {
      // issue_comment payloads carry no head SHA.
      const headSha: string =
        payload.pull_request?.head.sha ??
        (
          await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: targetNumber,
          })
        ).data.head.sha

      const { data: checkRun } = await octokit.rest.checks.create({
        owner,
        repo,
        name: 'AgentScan',
        head_sha: headSha,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        output: {
          title: 'Analyzing contributor activity',
          summary: `AgentScan is analyzing @${username}'s public activity for automation signals.`,
        },
      })
      checkRunId = checkRun.id
    } catch {
      // checks:write permission not granted
    }
  }

  type CheckConclusion = 'success' | 'action_required' | 'failure' | 'neutral'

  // The check run is concluded once; later calls (timeout, finally) are no-ops.
  let isCheckRunSettled = false

  const completeCheckRun = async (
    conclusion: CheckConclusion,
    title: string,
    summary: string,
  ) => {
    if (!checkRunId || isCheckRunSettled) {
      return
    }

    // Set before the request so a concurrent call skips.
    isCheckRunSettled = true

    // GitHub never expires an in-progress check run, so it must always get a conclusion.
    const result = {
      owner,
      repo,
      check_run_id: checkRunId,
      status: 'completed' as const,
      conclusion,
      completed_at: new Date().toISOString(),
    }

    try {
      await octokit.rest.checks.update({
        ...result,
        details_url: profileUrl(username),
        output: { title, summary },
      })
      return
    } catch (err: unknown) {
      console.error(
        `Failed to complete check run ${checkRunId} on ${owner}/${repo}:`,
        err,
      )
    }

    // unblocks the PR
    try {
      await octokit.rest.checks.update(result)
    } catch (err: unknown) {
      isCheckRunSettled = false
      console.error(
        `Failed to complete check run ${checkRunId} on ${owner}/${repo} without output:`,
        err,
      )
    }
  }

  // Concludes the check run if processing outlives the deadline.
  let deadline: NodeJS.Timeout | undefined

  if (checkRunId) {
    deadline = setTimeout(() => {
      completeCheckRun(
        'neutral',
        'Analysis timed out',
        'AgentScan did not finish analyzing this contributor in time. Comment `@agentscanapp scan` to try again.',
      )
    }, CHECK_RUN_DEADLINE_MS)
  }

  try {
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
      (authorAssociation &&
        repoConfig['trusted-author-associations'].includes(authorAssociation))
    ) {
      await completeCheckRun(
        'success',
        'Analysis skipped',
        'This contributor is exempt from analysis (allow-listed or a trusted author association).',
      )
      return { ok: true }
    }

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
      // list unavailable
    }

    const hasCommunityFlag = verified.some((a) => a.username === username)

    const installation = (await octokit.auth({
      type: 'installation',
    })) as OctokitAuthInstall

    const result = await analyze(username, {
      token: installation?.token,
      showEvents: true,
    })
    const analysis = result.report
    const userId = result.user.id

    // GitHub App accounts (`type: "Bot"`) are CI: pass the check without commenting or labelling.
    if (analysis.isGitHubApp) {
      await completeCheckRun(
        'success',
        'GitHub App',
        `@${username} is a GitHub App. Automated activity is expected from it, so there is nothing to report.`,
      )
      return { ok: true }
    }

    const details = hasCommunityFlag
      ? COMMUNITY_FLAGGED_DETAILS
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

    // Applies regardless of `mode`: the honeypot needs the bait comment.
    if (repoConfig.honeypot && !shouldAutoClose) {
      try {
        const comments = await octokit.paginate(
          octokit.rest.issues.listComments,
          {
            owner,
            repo,
            issue_number: targetNumber,
            per_page: 100,
          },
        )

        const alreadyBaited = comments.some(
          (c) =>
            isOwnComment(c, config.githubAppId) &&
            extractHoneypotToken(c.body) !== null,
        )

        if (!alreadyBaited) {
          // A blank first-time greeting falls back to the custom regular one.
          const greeting = isFirstTimeContributor
            ? repoConfig.messages['honeypot-first-time']?.trim() ||
              repoConfig.messages.honeypot
            : repoConfig.messages.honeypot

          await octokit.rest.issues.createComment({
            owner,
            repo,
            issue_number: targetNumber,
            body: buildHoneypotComment({
              token: createHoneypotToken(),
              username,
              isPR,
              greeting,
              isFirstTime: isFirstTimeContributor,
            }),
          })
        }
      } catch (err: unknown) {
        if (
          err instanceof Error &&
          !err.message.includes('Resource not accessible')
        ) {
          throw err
        }
      }
    }

    if (
      !repoConfig['comment-on-organic'] &&
      !hasCommunityFlag &&
      analysis.classification === 'organic'
    ) {
      await completeCheckRun(checkConclusion, details.label, description)
      return { ok: true }
    }

    if (repoConfig.mode === 'silent') {
      if (shouldAutoClose) {
        await completeCheckRun(checkConclusion, details.label, description)
      } else {
        await completeCheckRun(
          'success',
          'Analysis skipped',
          'AgentScan is configured in silent mode for this repository.',
        )
      }
      return { ok: true }
    }

    const MARKER = '<!-- agentscanapp-bot -->'

    const sourceUrl: string =
      payload.pull_request?.html_url ??
      payload.issue?.html_url ??
      `https://github.com/${owner}/${repo}/${isPR ? 'pull' : 'issues'}/${targetNumber}`

    const reportUrl =
      analysis.classification === 'automation' && !hasCommunityFlag
        ? buildReportIssueUrl({
            username,
            userId,
            flags: analysis.flags,
            sourceUrl,
          })
        : null

    // Evidence rendered inline in the comment.
    const evidenceLines =
      analysis.flags.length > 0
        ? buildEvidenceLines({ flags: analysis.flags })
        : []

    const body = [
      MARKER,
      `### ${details.label}`,
      '',
      description,
      '',
      `[View full analysis →](${profileUrl(username)})`,
      ...(reportUrl ? ['', `[Report this account →](${reportUrl})`] : []),
      ...(evidenceLines.length > 0
        ? [
            '',
            '<details>',
            '<summary>Evidence</summary>',
            '',
            ...evidenceLines,
            '',
            '</details>',
          ]
        : []),
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
        } else if (
          analysis.classification !== 'organic' &&
          analysis.classification !== 'insufficient-data'
        ) {
          const labelMap: LabelMap = {
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
                  // label already exists or no create permission
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

    await completeCheckRun(checkConclusion, details.label, description)

    return {
      ok: true,
      flagged: hasCommunityFlag,
      classification: analysis.classification,
    }
  } catch (err) {
    await completeCheckRun(
      'failure',
      'Analysis failed',
      'AgentScan encountered an error while analyzing this contributor.',
    )
    throw err
  } finally {
    clearTimeout(deadline)

    // Concludes the check run as neutral if nothing above did.
    await completeCheckRun(
      'neutral',
      'Analysis incomplete',
      'AgentScan did not produce a result for this contributor.',
    )
  }
})
