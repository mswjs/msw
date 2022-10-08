import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/user', async () => {
    const originalResponse = await ctx.fetch('/user')
    const body = await originalResponse.json()

    return HttpResponse.json({
      name: body.name,
      location: body.location,
      mocked: true,
    })
  }),

  rest.get('/repos/:owner/:repoName', async ({ request }) => {
    const originalResponse = await ctx.fetch(request)
    const body = await originalResponse.json()

    return HttpResponse.json({
      name: body.name,
      stargazers_count: 9999,
    })
  }),

  rest.get('/headers', async ({ request }) => {
    const originalResponse = await ctx.fetch('/headers-proxy', {
      method: 'POST',
      headers: request.headers,
    })
    const body = await originalResponse.json()

    return HttpResponse.json(body)
  }),

  rest.post('/posts', async ({ request }) => {
    const originalResponse = await ctx.fetch(request)
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
    const originalResponse = await ctx.fetch(request)
    const body = await originalResponse.json()

    return HttpResponse.json({
      ...body,
      mocked: true,
    })
  }),

  rest.head('/posts', async ({ request }) => {
    const originalResponse = await ctx.fetch(request)

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
