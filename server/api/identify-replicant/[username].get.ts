import { identify } from '@unveil/identity'
import * as v from 'valibot'

const MAX_API_ALLOWED_PAGES = 3

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
    const octokit = createOctokit(config.githubToken)
    const formattedUsername = formatUsername(username)

    const { data: user } = await octokit.rest.users.getByUsername({
      username: formattedUsername,
    })

    const pageRequests = Array.from(
      { length: MAX_API_ALLOWED_PAGES },
      (_, index) => {
        return octokit.rest.activity.listPublicEventsForUser({
          username: formattedUsername,
          per_page: 100,
          page: index + 1,
        })
      },
    )

    const responses = await Promise.all(pageRequests)
    const events = responses.flatMap((response) => response.data)

    return {
      analysis: identify({
        user,
        events,
      }),
      events: parsedQuery.output.show_events ? events : [],
      eventsCount: events.length,
    }
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

    console.log('unknown error', JSON.stringify(error, null, 2))

    throw createError({
      statusCode: 500,
      message: 'An error occurred while analyzing the user',
    })
  }
})
