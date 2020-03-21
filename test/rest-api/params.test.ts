import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: URI parameters', () => {
  let api: TestAPI

  beforeAll(async () => {
    api = await runBrowserWith(path.resolve(__dirname, 'params.mocks.ts'))
  })

  afterAll(() => {
    return api.cleanup()
  })

  it('should retrieve parameters from the URI', async () => {
    const REQUEST_URL = 'https://api.github.com/users/octocat/messages/abc-123'
    api.page.evaluate((url) => fetch(url), REQUEST_URL)
    const res = await api.page.waitForResponse(REQUEST_URL)
    const body = await res.json()

    expect(res.status()).toBe(200)
    expect(body).toEqual({
      username: 'octocat',
      messageId: 'abc-123',
    })
  })
})
