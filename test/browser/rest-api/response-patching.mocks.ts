import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('*/user', async (req, res, ctx) => {
    /**
     * @note Do not pass the entire "req" as the input to "ctx.fetch"
     * because then the bypassed request will inherit the "Accept-Language" header
     * that's used by tests to await for responses. It will await the incorrect
     * response in that case.
     */
    const originalResponse = await ctx.fetch(req.url.href)
    const body = await originalResponse.json()

    return res(
      ctx.json({
        name: body.name,
        location: body.location,
        mocked: true,
      }),
    )
  }),

  rest.get('*/repos/:owner/:repoName', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req.url.href)
    const body = await originalResponse.json()

    return res(
      ctx.json({
        name: body.name,
        stargazers_count: 9999,
      }),
    )
  }),

  rest.get('*/headers', async (req, res, ctx) => {
    const proxyUrl = new URL('/headers-proxy', req.url).href
    const originalResponse = await ctx.fetch(proxyUrl, {
      method: 'POST',
      headers: req.headers.all(),
    })
    const body = await originalResponse.json()

    return res(ctx.json(body))
  }),

  rest.post('*/posts', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req)
    const body = await originalResponse.json()

    return res(
      ctx.set('x-custom', originalResponse.headers.get('x-custom')!),
      ctx.json({
        ...body,
        mocked: true,
      }),
    )
  }),

  rest.get('*/posts', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req.url.href)
    const body = await originalResponse.json()

    return res(
      ctx.json({
        ...body,
        mocked: true,
      }),
    )
  }),

  rest.head('*/posts', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req.url.href, { method: 'HEAD' })

    return res(ctx.set('x-custom', originalResponse.headers.get('x-custom')!))
  }),
)

worker.start()
