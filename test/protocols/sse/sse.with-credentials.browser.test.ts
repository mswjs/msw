import { sse } from 'msw'
import { test, expect } from '../../setup/vitest-helpers'

test('forwards document cookies on the request when "withCredentials" is set to true', async ({
  network,
  page,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await page.evaluate(() => {
    document.cookie = 'foo=bar'
  })

  await page.evaluate(async () => {
    network.use(
      sse('http://localhost/stream', ({ cookies }) => {
        console.log(JSON.stringify({ cookies }))
      }),
    )
  })

  await page.evaluate((url) => {
    return new Promise<void>((resolve, reject) => {
      const source = new EventSource('http://localhost/stream', {
        withCredentials: true,
      })
      source.onopen = () => resolve()
      source.onerror = () => reject(new Error('EventSource connection failed'))
    })
  })

  expect(consoleSpy.get('log')).toContain(
    JSON.stringify({
      cookies: {
        foo: 'bar',
      },
    }),
  )
})
