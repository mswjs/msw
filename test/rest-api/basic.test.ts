import * as path from 'path'
import { BootstrapApi, bootstrap } from '../support/bootstrap'

describe('REST: Basic example', () => {
  let api: BootstrapApi

  beforeAll(async () => {
    api = await bootstrap(path.resolve(__dirname, 'basic.mocks.ts'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  it('should receive mocked response', async () => {
    const REQUEST_URL = 'https://api.github.com/users/octocat'
    api.page.evaluate((url) => fetch(url), REQUEST_URL)
    const res = await api.page.waitForResponse(REQUEST_URL)
    const body = await res.json()

    expect(res.status()).toBe(200)
    expect(body).toEqual({
      name: 'John Maverick',
      originalUsername: 'octocat',
    })
  })
})
