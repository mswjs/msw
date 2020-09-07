import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/user', async (req, res, ctx) => {
    const originalResponse = await ctx.gracefullyFetch(
      'https://api.github.com/users/octocat',
    )

    return res(
      ctx.json({
        name: originalResponse.name,
        location: originalResponse.location,
        mocked: true,
      }),
    )
  }),

  rest.get(
    'https://api.github.com/repos/:owner/:repoName',
    async (req, res, ctx) => {
      const originalResponse = await ctx.gracefullyFetch(req)

      return res(
        ctx.json({
          name: originalResponse.name,
          stargazers_count: 9999,
        }),
      )
    },
  ),

  rest.get('https://test.mswjs.io/headers', async (req, res, ctx) => {
    const originalResponse = await ctx.gracefullyFetch('/headers-proxy', {
      method: 'POST',
      headers: req.headers.getAllHeaders(),
    })

    return res(ctx.json(originalResponse))
  }),

  rest.post('/posts', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req)
    const body = await originalResponse.json()
    return res(
      ctx.set('x-custom', originalResponse.headers.get('x-custom')),
      ctx.json({
        ...body,
        mocked: true,
      }),
    )
  }),

  rest.get('/posts', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req)

    return res(
      ctx.json({
        ...originalResponse,
        mocked: true,
      }),
    )
  }),

  rest.head('/posts', async (req, res, ctx) => {
    return res(
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

worker.start()
