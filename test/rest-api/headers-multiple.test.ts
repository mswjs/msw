import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Multiple headers with the same name', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(
      path.resolve(__dirname, 'headers-multiple.mocks.ts'),
    )
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given handling a request header with multiple values', () => {
    it('should receive all the headers', async () => {
      const headers = new Headers({ 'x-header': 'application/json' })
      headers.append('x-header', 'application/hal+json')

      const res = await test.request({
        url: 'https://test.msw.io',
        fetchOptions: {
          method: 'POST',
          headers,
        },
      })
      const status = res.status()
      const body = await res.json()

      expect(status).toEqual(200)
      expect(body).toEqual({
        'x-header': 'application/json,application/hal+json',
      })
    })
  })

  describe('given mocking a header with multiple values', () => {
    it('should receive all the headers', async () => {
      const res = await test.request({
        url: 'https://test.msw.io',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.json()

      expect(status).toEqual(200)
      expect(headers).toHaveProperty('accept', 'application/json,image/png')
      expect(body).toEqual({
        mocked: true,
      })
    })
  })
})
