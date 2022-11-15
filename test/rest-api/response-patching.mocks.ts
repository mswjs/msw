import { setupWorker, rest, HttpResponse, bypass } from 'msw'

const worker = setupWorker(
  rest.get('/user', async () => {
    const fetchArgs = await bypass('/user')
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json({
      name: body.name,
      location: body.location,
      mocked: true,
    })
  }),

  rest.get('/repos/:owner/:repoName', async ({ request }) => {
    const fetchArgs = await bypass(request)
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json({
      name: body.name,
      stargazers_count: 9999,
    })
  }),

  rest.get('/headers', async ({ request }) => {
    const fetchArgs = await bypass('/headers-proxy', {
      method: 'POST',
      headers: request.headers,
    })
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json(body)
  }),

  rest.post('/posts', async ({ request }) => {
    const fetchArgs = await bypass(request)
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json(
      {
        ...body,
        mocked: true,
      },
      {
        headers: {
          'X-Custom': originalResponse.headers.get('x-custom') || '',
        },
      },
    )
  }),

  rest.get('/posts', async ({ request }) => {
    const fetchArgs = await bypass(request)
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json({
      ...body,
      mocked: true,
    })
  }),

  rest.head('/posts', async ({ request }) => {
    const fetchArgs = await bypass(request)
    const originalResponse = await fetch(...fetchArgs)

    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: {
          'X-Custom': originalResponse.headers.get('x-custom') || '',
        },
      },
    )
  }),
)

worker.start()
