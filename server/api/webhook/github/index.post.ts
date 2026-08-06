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

// Netlify's synchronous function timeout is 10s. Leave room to conclude the
// check run before the process is killed.
const CHECK_RUN_DEADLINE_MS = 8_000

type AutomationListItem = {
  username: string
  reason: string
  createdAt: string
  issueUrl: string
}

type LabelMap = Record<
  Exclude<IdentityClassification, 'organic' | 'insufficient-data'>,
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

  // issue_comment events are only of interest to the honeypot, which needs to
  // see the contributor's reply to the bait comment.
  const isCommentEvent =
    payload.action === 'created' && !!payload.comment && !!payload.issue

  if (
    payload.action !== 'opened' &&
    payload.action !== 'reopened' &&
    !isCommentEvent
  ) {
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
    | AuthorAssociation
    | undefined

  // GitHub reports both for an author with no merged contribution here:
  // `first_timer` is new to GitHub entirely, `first_time_contributor` is new
  // to this repository. Either way it is their first PR/issue on the repo.
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
    // no config file. use defaults
  }

  if (isCommentEvent) {
    if (!repoConfig.honeypot) {
      return { ok: true }
    }

    // Only the author of the PR/issue can spring their own trap. A maintainer
    // or third party quoting the code is not a signal about the contributor.
    const commentAuthor: string | undefined = payload.comment.user?.login

    if (
      !commentAuthor ||
      commentAuthor !== username ||
      isKnownBot(commentAuthor)
    ) {
      return { ok: true }
    }

    // Paginated: on a long thread the bait comment is not on the last page, and
    // missing it would mean never matching the reply that sprang the trap.
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

    // Only our own comments count: the code the reply is matched against has to
    // be one we issued, or a third party could plant a marker holding a code the
    // author is likely to type anyway (a short commit SHA is 12 hex characters
    // too) and have their contribution closed for them.
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
      // checks:write permission not granted
    }
  }

  type CheckConclusion = 'success' | 'action_required' | 'failure' | 'neutral'

  let checkRunSettled = false

  const completeCheckRun = async (
    conclusion: CheckConclusion,
    title: string,
    summary: string,
    { fallback = false }: { fallback?: boolean } = {},
  ) => {
    if (!checkRunId || (fallback && checkRunSettled)) {
      return
    }

    checkRunSettled = true

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await octokit.rest.checks.update({
          owner,
          repo,
          check_run_id: checkRunId,
          status: 'completed',
          conclusion,
          completed_at: new Date().toISOString(),
          details_url: `https://agentscan.tools/user/${username}`,
          output: { title, summary },
        })
        return
      } catch {
        // retry once, then give up
      }
    }
  }

  const deadline = checkRunId
    ? setTimeout(() => {
        void completeCheckRun(
          'neutral',
          'Analysis timed out',
          'AgentScan did not finish analyzing this contributor in time. Re-run this check or reopen the pull request to try again.',
          { fallback: true },
        )
      }, CHECK_RUN_DEADLINE_MS)
    : undefined

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
      // list unavailable
    }

    const hasCommunityFlag = verified.some((a) => a.username === username)
    const userId: number | undefined = user.id

    const analysis: IdentifyResult = identify({ user, events })

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

    // Posted before any early return: the honeypot exists precisely to catch
    // the accounts that the activity heuristics read as organic.
    //
    // `mode` deliberately does not apply here. The bait is a comment: there
    // is no honeypot without one.
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
          // A blank first-time greeting falls back to the regular custom one,
          // so a repo that only customised `honeypot` keeps a single voice.
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
            classification: analysis.classification,
            score: analysis.score,
            flags: analysis.flags,
            sourceUrl,
          })
        : null

    // Rendered inline so a reviewer can see the evidence without leaving this page.
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
      `[View full analysis →](https://agentscan.tools/user/${username})`,
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

    // Catches any exit that reached neither a conclusion nor the catch above —
    // an early return added later, or a non-Error thrown past it.
    await completeCheckRun(
      'neutral',
      'Analysis incomplete',
      'AgentScan did not produce a result for this contributor.',
      { fallback: true },
    )
  }
})
