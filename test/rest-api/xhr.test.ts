import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('XHR', () => {
  let test: TestAPI

  beforeAll(async () => {
    test = await runBrowserWith(path.resolve(__dirname, 'xhr.mocks.ts'))
  })

  afterAll(() => {
    return test.cleanup()
  })

  it('should return the mocked response', async () => {
    const REQUEST_URL = 'https://api.github.com/users/octocat'
    test.page.evaluate((url) => {
      const req = new XMLHttpRequest()
      req.open('GET', url)
      req.send()
    }, REQUEST_URL)
    const res = await test.page.waitForResponse(REQUEST_URL)
    const body = await res.json()

    expect(res.status()).toBe(200)
    expect(body).toEqual({
      mocked: true,
    })
  })
})
