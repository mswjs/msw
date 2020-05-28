import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

describe('setupServer / restoreHandlers', () => {
  const server = setupServer(
    rest.get('https://mswjs.io/books', (req, res, ctx) => {
      return res(ctx.json({ title: 'Original title' }))
    }),
  )

  beforeAll(() => {
    server.listen()

    server.use(
      rest.get('https://mswjs.io/books', (req, res, ctx) => {
        return res.once(ctx.json({ title: 'Overridden title' }))
      }),
    )
  })

  afterAll(() => server.close())

  describe('given I had a one-time request handler override', () => {
    it('should return a mocked response from the one-time request handler upon the first requests', async () => {
      const res = await fetch('https://mswjs.io/books')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({ title: 'Overridden title' })
    })

    it('should return an original response upon subsequent requests', async () => {
      const res = await fetch('https://mswjs.io/books')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual({ title: 'Original title' })
    })

    describe('given I restored the one-time handlers', () => {
      beforeAll(() => server.restoreHandlers())

      it('should restore the used state of the one-time request handler', async () => {
        const res = await fetch('https://mswjs.io/books')
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toEqual({ title: 'Overridden title' })
      })

      it('should return an original response upon subsequent requests', async () => {
        const res = await fetch('https://mswjs.io/books')
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body).toEqual({ title: 'Original title' })
      })
    })
  })
})
