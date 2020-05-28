import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / resetHandlers', () => {
  const server = setupServer(
    rest.get('https://mswjs.io/books', (req, res, ctx) => {
      return res(ctx.json({ title: 'Original title' }))
    }),
  )

  beforeAll(() => {
    server.listen()
    server.use(
      rest.post('https://mswjs.io/login', (req, res, ctx) => {
        return res(ctx.json({ accepted: true }))
      }),
      rest.get('https://mswjs.io/books', (req, res, ctx) => {
        return res(ctx.json({ title: 'Overridden title' }))
      }),
    )
  })

  afterAll(() => server.close())

  describe('given I reset request handlers', () => {
    describe('and do not provide explicit next handlers', () => {
      beforeAll(() => {
        server.resetHandlers()
      })

      it('should remove all request handlers added on runtime', async () => {
        const res = await fetch('https://mswjs.io/login', { method: 'POST' })

        expect(res.status).toBe(404)
      })

      it('should preserve the initial request handlers', async () => {
        const res = await fetch('https://mswjs.io/books')
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toEqual({ title: 'Original title' })
      })
    })

    describe('and provide explicit next handlers', () => {
      beforeAll(() => {
        server.resetHandlers(
          rest.get('https://mswjs.io/products', (req, res, ctx) => {
            return res(ctx.json([1, 2, 3]))
          }),
        )
      })

      it('should remove all request handlers added on runtime', async () => {
        const res = await fetch('https://mswjs.io/login', { method: 'POST' })

        expect(res.status).toBe(404)
      })

      it('should remove the initial request handlers', async () => {
        const res = await fetch('https://mswjs.io/books')

        expect(res.status).toBe(404)
      })

      it('should use the provided explicit request handlers', async () => {
        const res = await fetch('https://mswjs.io/products')
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toEqual([1, 2, 3])
      })
    })
  })
})
