import { setupWorker, graphql, bypass, HttpResponse } from 'msw'

interface GetUserQuery {
  user: {
    firstName: string
    lastName: string
  }
}

const worker = setupWorker(
  graphql.query<GetUserQuery>('GetUser', async ({ request }) => {
    const fetchArgs = await bypass(request)
    const originalResponse = await fetch(...fetchArgs)
    const originalJson = await originalResponse.json()

    return HttpResponse.json({
      data: {
        user: {
          firstName: 'Christian',
          lastName: originalJson.data?.user?.lastName,
        },
      },
      errors: originalJson.errors,
    })
  }),
)

// @ts-ignore
window.msw = {
  registration: worker.start(),
}
