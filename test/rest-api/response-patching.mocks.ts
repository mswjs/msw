import { setupWorker, rest, HttpResponse, bypass } from 'msw'

const worker = setupWorker(
  rest.get('/user', async () => {
    const originalResponse = await fetch(bypass('/user'))
    const body = await originalResponse.json()

    return HttpResponse.json({
      name: body.name,
      location: body.location,
      mocked: true,
    })
  }),

  rest.get('/repos/:owner/:repoName', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    const body = await originalResponse.json()

    return HttpResponse.json({
      name: body.name,
      stargazers_count: 9999,
    })
  }),

  rest.get('/headers', async ({ request }) => {
    const originalResponse = await fetch(bypass('/headers-proxy'), {
      method: 'POST',
      headers: request.headers,
    })
    const body = await originalResponse.json()

    return HttpResponse.json(body)
  }),

  rest.post('/posts', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    const body = await originalResponse.json()

    return HttpResponse.json(
      {
        ...body,
        mocked: true,
      },
      {
        headers: {
          'X-Custom': originalResponse.headers.get('x-custom'),
        },
      },
    )
  }),

  rest.get('/posts', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    const body = await originalResponse.json()

    return HttpResponse.json({
      ...body,
      mocked: true,
    })
  }),

  rest.head('/posts', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))

    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: {
          'X-Custom': originalResponse.headers.get('x-custom'),
        },
      },
    )
  }),
)

worker.start()
