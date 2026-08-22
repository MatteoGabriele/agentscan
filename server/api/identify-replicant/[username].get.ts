import { analyze } from '@unveil/vk'
import * as v from 'valibot'

const QuerySchema = v.object({
  show_events: v.pipe(
    v.string('show_events must be a string'),
    v.check(
      (value) => value === 'true' || value === 'false',
      "show_events must be 'true' or 'false'",
    ),
    v.transform((value) => value === 'true'),
  ),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const username = getRouterParam(event, 'username')

  if (!username) {
    throw createError({
      statusCode: 400,
      message: 'Missing username parameter',
    })
  }

  const query = getQuery(event)
  const parsedQuery = v.safeParse(QuerySchema, {
    show_events: query.show_events ? String(query.show_events) : 'false',
  })

  if (!parsedQuery.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid query parameters',
    })
  }

  try {
    return analyze(formatUsername(username), {
      token: config.githubToken,
      showEvents: parsedQuery.output.show_events,
    })
  } catch (err: unknown) {
    const error = err as { status?: number; statusCode?: number }
    const status = error.status ?? error.statusCode

    if (status === 403) {
      throw createError({
        statusCode: 429,
        message: 'GitHub API rate limit reached. Please try again later.',
      })
    }

    if (status === 404) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }

    throw createError({
      statusCode: 500,
      message: 'An error occurred while analyzing the user',
    })
  }
})
