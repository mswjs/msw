import { setupWorker, graphql } from 'msw'

const worker = setupWorker(
  graphql.query('Login', (_req, res, ctx) => {
    return res(
      ctx.data({
        user: {
          id: 1,
          name: 'Joe Bloggs',
          password: 'HelloWorld!',
        },
      }),
      ctx.extensions({
        message: 'This is a mocked extension',
        tracking: {
          version: '0.1.2',
          page: '/test/',
        },
      }),
    )
  }),
)

worker.start()
