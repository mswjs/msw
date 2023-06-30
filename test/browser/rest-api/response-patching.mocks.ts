import { rest, HttpResponse, bypass } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('*/user', async ({ request }) => {
    const fetchArgs = await bypass(request.url)
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json(
      {
        name: body.name,
        location: body.location,
        mocked: true,
      },
      {
        headers: {
          'X-Source': 'msw',
        },
      },
    )
  }),

  rest.get('*/repos/:owner/:repoName', async ({ request }) => {
    const fetchArgs = await bypass(request)
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json(
      {
        name: body.name,
        stargazers_count: 9999,
      },
      {
        headers: {
          'X-Source': 'msw',
        },
      },
    )
  }),

  rest.get('*/headers', async ({ request }) => {
    const proxyUrl = new URL('/headers-proxy', request.url)
    const fetchArgs = await bypass(proxyUrl, {
      method: 'POST',
      headers: request.headers,
    })
    const originalResponse = await fetch(...fetchArgs)
    const body = await originalResponse.json()

    return HttpResponse.json(body, {
      headers: {
        'X-Source': 'msw',
      },
    })
  }),

  rest.post('*/posts', async ({ request }) => {
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
          'X-Source': 'msw',
          'X-Custom': originalResponse.headers.get('x-custom') || '',
        },
      },
    )
  }),

  rest.get('*/posts', async ({ request }) => {
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
          'X-Source': 'msw',
        },
      },
    )
  }),

  rest.head('*/posts', async ({ request }) => {
    const fetchArgs = await bypass(request)
    const originalResponse = await fetch(...fetchArgs)

    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: {
          'X-Source': 'msw',
          'X-Custom': originalResponse.headers.get('x-custom') || '',
        },
      },
    )
  }),
)

worker.start()
