import * as path from 'path'
import { BootstrapApi, bootstrap } from '../../support/bootstrap'

describe('REST: Context utilities', () => {
  let api: BootstrapApi

  beforeAll(async () => {
    api = await bootstrap(path.resolve(__dirname, 'context.client.tsx'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  it('should receive mocked response', async () => {
    await api.page.click('button')
    const res = await api.page.waitForResponse('https://test.msw.io/')

    expect(res.fromServiceWorker()).toBe(true)
    expect(res.status()).toEqual(305)
    expect(res.statusText()).toEqual('Yahoo!')

    const headers = res.headers()
    expect(headers).toHaveProperty('content-type', 'application/json')
    expect(headers).toHaveProperty('accept', 'foo/bar')
    expect(headers).toHaveProperty('custom-header', 'arbitrary-value')

    const body = await res.json()
    expect(body).toEqual({
      mocked: true,
    })
  })
})
