import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

test('TKO a cors request', async () => {
  const runtime = await runBrowserWith(path.resolve(__dirname, 'cors.mocks.ts'))

  const errors = []
  runtime.page.on('pageerror', (err) => {
    errors.push(err)
  })

  await runtime.page.evaluate(() => {
    const img = document.createElement('img')
    img.src = 'https://via.placeholder.com/150'
    const body = document.querySelector('body')
    body.appendChild(img)
  })

  await sleep(2000)
  expect(errors.length).toBe(0)
  return runtime.cleanup()
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
