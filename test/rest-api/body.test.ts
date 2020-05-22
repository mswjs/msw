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
    describe('and I performed a GET request without a body', () => {
      it('should not return any request body', async () => {
        const res = await test.request({
          url: `${test.origin}/login`,
        })
        const body = await res.json()

        expect(body).toEqual({ body: undefined })
      })
    })

    describe('and I performed a POST request with intentionally empty body', () => {
      it('should return the request body as-is', async () => {
        const res = await test.request({
          url: `${test.origin}/login`,
          fetchOptions: {
            method: 'POST',
            body: '',
          },
        })
        const body = await res.json()

        expect(body).toEqual({ body: '' })
      })
    })

    describe('and I performed a POST request with a text body', () => {
      it('should return a text request body as-is', async () => {
        const res = await test.request({
          url: `${test.origin}/login`,
          fetchOptions: {
            method: 'POST',
            body: 'text-body',
          },
        })
        const body = await res.json()

        expect(body).toEqual({ body: 'text-body' })
      })
    })

    describe('and I performed a POST request with a JSON body without any "Content-Type" header', () => {
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

        expect(body).toEqual(`{"body":"{\\"json\\":\\"body\\"}"}`)
      })
    })

    describe('and I performed a POST request with a JSON body with a "Content-Type" header', () => {
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
          body: {
            json: 'body',
          },
        })
      })
    })
  })
})
