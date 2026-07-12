import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const rawBody = await readRawBody(event)
  if (!rawBody) {
    throw createError({
      statusCode: 400,
      message: 'Empty body',
    })
  }

  if (!config.discordPublicKey) {
    throw createError({
      statusCode: 503,
      message: 'Discord public key not configured',
    })
  }

  const signature = getHeader(event, 'x-signature-ed25519')
  const timestamp = getHeader(event, 'x-signature-timestamp')

  if (!signature || !timestamp) {
    throw createError({
      statusCode: 401,
      message: 'Invalid request signature',
    })
  }

  const isValid = await verifyKey(
    rawBody,
    signature,
    timestamp,
    config.discordPublicKey,
  )

  if (!isValid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid request signature',
    })
  }

  const interaction = JSON.parse(rawBody)

  if (interaction.type === InteractionType.PING) {
    return {
      type: InteractionResponseType.PONG,
    }
  }

  return {
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: 'Not implemented yet.',
    },
  }
})
