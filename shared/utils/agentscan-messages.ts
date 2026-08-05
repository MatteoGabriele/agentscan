import { getClassificationDetails } from '@unveil/identity'

/**
 * Used instead of the classification details when the account appears on the
 * community-flagged list.
 */
export const COMMUNITY_FLAGGED_DETAILS = {
  label: 'Flagged by community',
  description:
    'This account has been flagged as potentially automated by the community.',
}

/**
 * What the bot comments when `messages.*` is left blank in agentscan.yml.
 * Shared so the config generator can show the real text rather than describe it.
 */
export function getDefaultMessages() {
  return {
    organic: getClassificationDetails('organic').description,
    mixed: getClassificationDetails('mixed').description,
    automation: getClassificationDetails('automation').description,
    'community-flagged': COMMUNITY_FLAGGED_DETAILS.description,
  }
}

export function buildDefaultHoneypotGreeting({
  username,
  subject,
  isPR,
  isFirstTime = false,
}: {
  username: string
  subject: string
  isPR: boolean
  isFirstTime?: boolean
}) {
  if (isFirstTime) {
    return buildDefaultFirstTimeHoneypotGreeting({ username, subject, isPR })
  }

  return [
    `### Thanks for opening this ${subject}! 🎉`,
    '',
    `We really appreciate you taking the time to contribute, @${username}.`,
    '',
    `A maintainer will take a look as soon as they can. In the meantime, please make sure that:`,
    '',
    `- the description explains what changed and why`,
    `- any related issues are linked`,
    ...(isPR ? [`- existing tests still pass`] : []),
    '',
    `If anything needs adjusting we'll leave comments here. Thanks again!`,
  ]
}

/**
 * Greeting used when GitHub reports the author as opening their first
 * PR/issue on the repository.
 */
export function buildDefaultFirstTimeHoneypotGreeting({
  username,
  subject,
  isPR,
}: {
  username: string
  subject: string
  isPR: boolean
}) {
  return [
    `### Hello! Thank you for opening your **first ${subject}** 👋`,
    '',
    `Great to have you here, @${username} — thanks for taking the time to contribute.`,
    '',
    `Since it's your first one, a quick note on what helps a maintainer review it:`,
    '',
    `- explain what changed and why in the description`,
    `- link any related issues`,
    ...(isPR
      ? [`- check that existing tests still pass`]
      : [`- include steps to reproduce, if it's a bug`]),
    '',
    `Don't worry about getting everything right the first time — we'll leave comments here if anything needs adjusting. Welcome aboard!`,
  ]
}
