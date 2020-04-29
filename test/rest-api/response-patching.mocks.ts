import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.msw.io/user', async (req, res, ctx) => {
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

  rest.post('/posts', async (req, res, ctx) => {
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
