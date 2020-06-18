import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Binary response types', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'body-binary.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  describe('given a binary response', () => {
    it('should return a binary response', async () => {
      const res = await test.request({
        url: 'https://test.mswjs.io/binary',
      })
      const status = res.status()
      const headers = res.headers()
      const body = await res.buffer()

      expect(status).toBe(200)
      expect(headers).toHaveProperty('x-powered-by', 'msw')
      expect(new Uint8Array(body)).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]))
    })
  })
})
