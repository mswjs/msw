import * as path from 'path'
import { BootstrapApi, bootstrap } from '../../support/bootstrap'

describe('REST: Context utilities', () => {
  let api: BootstrapApi

  beforeAll(async () => {
    api = await bootstrap(path.resolve(__dirname, 'context.mocks.ts'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  it('should receive mocked response', async () => {
    const REQUEST_URL = 'https://test.msw.io/'
    api.page.evaluate((url) => fetch(url), REQUEST_URL)
    const res = await api.page.waitForResponse(REQUEST_URL)
    const headers = res.headers()
    const body = await res.json()

    expect(res.status()).toEqual(305)
    expect(res.statusText()).toEqual('Yahoo!')
    expect(headers).toHaveProperty('content-type', 'application/json')
    expect(headers).toHaveProperty('accept', 'foo/bar')
    expect(headers).toHaveProperty('custom-header', 'arbitrary-value')
    expect(body).toEqual({
      mocked: true,
    })
  })
})
