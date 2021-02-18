import * as path from 'path'
import { pageWith } from 'page-with'

test('handles FormData as a request body', async () => {
  const { page, makeUrl } = await pageWith({
    example: path.resolve(__dirname, 'body-form-data.mocks.ts'),
    markup: path.resolve(__dirname, 'body-form-data.page.html'),
  })

  await page.click('button')

  const res = await page.waitForResponse(makeUrl('/sign-in'))
  const status = res.status()
  const json = await res.json()

  expect(status).toBe(200)
  expect(json).toEqual({
    username: 'john.maverick',
    password: 'secret123',
  })
})
