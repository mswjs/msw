import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Context utilities', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'context.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  it('should receive mocked response', async () => {
    const res = await test.request({
      url: 'https://test.msw.io/',
    })
    const headers = res.headers()
    const body = await res.json()

    expect(res.status()).toEqual(305)
    expect(res.statusText()).toEqual('Yahoo!')
    expect(headers).toHaveProperty('x-powered-by', 'msw')
    expect(headers).toHaveProperty('content-type', 'application/json')
    expect(headers).toHaveProperty('accept', 'foo/bar')
    expect(headers).toHaveProperty('custom-header', 'arbitrary-value')
    expect(body).toEqual({
      mocked: true,
    })
  })
})
