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
}: {
  username: string
  subject: string
  isPR: boolean
}) {
  return [
    `### Thanks for your contribution! 🎉`,
    '',
    `Thanks for opening this ${subject}, @${username} — we really appreciate you taking the time to contribute.`,
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
