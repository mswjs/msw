import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: URI parameters', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'params.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  it('should retrieve parameters from the URI', async () => {
    const res = await test.request({
      url: 'https://api.github.com/users/octocat/messages/abc-123',
    })
    const status = res.status()
    const headers = res.headers()
    const body = await res.json()

    expect(status).toBe(200)
    expect(headers).toHaveProperty('x-powered-by', 'msw')
    expect(body).toEqual({
      username: 'octocat',
      messageId: 'abc-123',
    })
  })
})
