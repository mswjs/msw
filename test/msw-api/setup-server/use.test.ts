import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / use', () => {
  const server = setupServer(
    rest.get('https://mswjs.io/book/:bookId', (req, res, ctx) => {
      return res(ctx.json({ title: 'Original title' }))
    }),
  )

  beforeAll(() => server.listen())
  afterAll(() => server.close())

  describe('given I define a runtime request handler', () => {
    describe('that does not override any existing request handler', () => {
      beforeAll(() => {
        server.use(
          rest.post('https://mswjs.io/login', (req, res, ctx) => {
            return res(ctx.json({ accepted: true }))
          }),
        )
      })

      it('should return a mocked response to the runtime request handler', async () => {
        const res = await fetch('https://mswjs.io/login', { method: 'POST' })
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toEqual({ accepted: true })
      })
    })

    describe('that overrides an existing request handler', () => {
      describe('and overrides it persistently', () => {
        beforeAll(() => {
          server.use(
            rest.get('https://mswjs.io/book/:bookId', (req, res, ctx) => {
              return res(ctx.json({ title: 'Persistent override title' }))
            }),
          )
        })

        it('should return a mocked response to the handler override upon first hit', async () => {
          const res = await fetch('https://mswjs.io/book/abc-123')
          const body = await res.json()

          expect(res.status).toBe(200)
          expect(body).toEqual({ title: 'Persistent override title' })
        })

        it('should return a mocked response to the handler override upon subsequent calls', async () => {
          const calls = await Promise.all([
            fetch('https://mswjs.io/book/abc-123'),
            fetch('https://mswjs.io/book/def-456'),
          ])

          for (const res of calls) {
            const body = await res.json()

            expect(res.status).toBe(200)
            expect(body).toEqual({ title: 'Persistent override title' })
          }
        })
      })

      describe('and overrides it one-time', () => {
        beforeAll(() => {
          server.resetHandlers()

          server.use(
            rest.get('https://mswjs.io/book/:bookId', (req, res, ctx) => {
              return res.once(ctx.json({ title: 'One-time override title' }))
            }),
          )
        })

        it('should return a mocked response to the handler override upon first hit', async () => {
          const res = await fetch('https://mswjs.io/book/abc-123')
          const body = await res.json()

          expect(res.status).toBe(200)
          expect(body).toEqual({ title: 'One-time override title' })
        })

        it('should return a mocked response to the original handler in subsequent hits', async () => {
          const res = await fetch('https://mswjs.io/book/abc-123')
          const body = await res.json()

          expect(res.status).toBe(200)
          expect(body).toEqual({ title: 'Original title' })
        })
      })
    })
  })
})
