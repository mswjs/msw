import { inlineModule, test, expect } from '../../setup/playwright'

const example = inlineModule(({ http, HttpResponse, setupWorker }) => {
  const worker = setupWorker(
    http.get('*/resource', () => {
      return HttpResponse.json({ mocked: true })
    }),
  )
  worker.start()
})

test('keeps handling requests after the browser terminates the worker', async ({
  loadExample,
  page,
  fetch,
}) => {
  await loadExample(example)

  const session = await page.context().newCDPSession(page)
  await session.send('ServiceWorker.enable')
  await session.send('ServiceWorker.stopAllWorkers')
  await session.detach()

  const response = await fetch('/resource')

  expect(response.fromServiceWorker()).toBe(true)
  await expect(response.json()).resolves.toEqual({ mocked: true })
})
