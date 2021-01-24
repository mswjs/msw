import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

test('handles a CORS request with an "opaque" response', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'cors.mocks.ts'))

  const errors = []
  runtime.page.on('pageerror', (err) => {
    errors.push(err)
  })

  await runtime.page.evaluate(() => {
    const image = document.createElement('img')
    image.src = 'https://via.placeholder.com/150'
    document.body.appendChild(image)

    return new Promise((resolve) => {
      image.addEventListener('load', resolve)
    })
  })

  expect(errors).toEqual([])

  return runtime.cleanup()
})
