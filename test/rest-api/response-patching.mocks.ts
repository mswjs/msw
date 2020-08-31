import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/user', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(
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
      const originalResponse = await ctx.fetch(req)

      return res(
        ctx.json({
          name: originalResponse.name,
          stargazers_count: 9999,
        }),
      )
    },
  ),

  rest.get('https://test.mswjs.io/headers', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch('/headers-proxy', {
      method: 'POST',
      headers: req.headers.getAllHeaders(),
    })

    return res(ctx.json(originalResponse))
  }),

  rest.post('/posts', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req)

    return res(
      ctx.json({
        ...originalResponse,
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
)

worker.start()
