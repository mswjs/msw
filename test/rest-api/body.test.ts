import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Request body', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'body.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('when I reference "req.body" inside a request handler', () => {
    describe('and I performed a request with a text body', () => {
      it('should return a text request body as-is', async () => {
        const res = await test.request({
          url: `${test.origin}/login`,
          fetchOptions: {
            method: 'POST',
            body: 'text-body',
          },
        })

        const body = await res.text()

        expect(body).toEqual('text-body')
      })
    })

    describe('and I performed a request with a JSON body without any "Content-Type" header', () => {
      it('should return a text request body as-is', async () => {
        const res = await test.request({
          url: `${test.origin}/login`,
          fetchOptions: {
            method: 'POST',
            body: JSON.stringify({
              json: 'body',
            }),
          },
        })

        const body = await res.text()

        expect(body).toEqual('{"json":"body"}')
      })
    })

    describe('and I performed a request with a JSON body with a "Content-Type" header', () => {
      it('should return a text request body as-is', async () => {
        const res = await test.request({
          url: `${test.origin}/login`,
          fetchOptions: {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              json: 'body',
            }),
          },
        })

        const body = await res.json()

        expect(body).toEqual({
          json: 'body',
        })
      })
    })
  })

  // it('should receive mocked response', async () => {
  //   const res = await test.request({
  //     url: 'https://api.github.com/users/octocat',
  //   })
  //   const body = await res.json()

  //   expect(res.headers()).toHaveProperty('x-powered-by', 'msw')
  //   expect(res.status()).toBe(200)
  //   expect(body).toEqual({
  //     name: 'John Maverick',
  //     originalUsername: 'octocat',
  //   })
  // })
})
