import * as path from 'path'
import { TestAPI, runBrowserWith } from '../support/runBrowserWith'

describe('REST: Multiple headers with the same name', () => {
  let api: TestAPI

  beforeAll(async () => {
    api = await runBrowserWith(
      path.resolve(__dirname, 'headers-multiple.mocks.ts'),
    )
  })

  afterAll(() => {
    return api.cleanup()
  })

  it('should receive all the headers', async () => {
    const REQUEST_URL = 'https://test.msw.io/'
    api.page.evaluate((url) => fetch(url), REQUEST_URL)
    const res = await api.page.waitForResponse(REQUEST_URL)
    const headers = res.headers()
    const body = await res.json()

    expect(res.status()).toEqual(200)
    expect(headers).toHaveProperty('accept', 'application/json, image/png')
    expect(body).toEqual({
      mocked: true,
    })
  })
})
